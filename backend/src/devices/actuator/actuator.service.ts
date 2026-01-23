import {ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {FileService} from "../../helpers/file/file.service";
import {MixService} from "../../mixing/mix/mix.service";
import {Actuator, ActuatorJSON} from "@common/devices/actuator/actuator";
import {GroupService} from "../group/group.service";
import {ActuatorEditChanges} from "@common/devices/actuator/rest-classes";
import {Datum, DatumChangeType} from "@common/mixing/mix/datum";
import {EntityType} from "@common/devices/constants";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {GetDevicesOptions} from "@common/devices/rest-classes";

const SAVE_FILE = "devices/actuator.json";

@Injectable()
export class ActuatorService extends PersistentDataService<ActuatorData, ActuatorDataJSON> {
    
    
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => GroupService))
        private groupService: GroupService,
        private mixService: MixService
    ) {
        super(fileService, SAVE_FILE, ActuatorData);
    }
    
    public async getAllActuators(options: GetDevicesOptions = {}): Promise<Actuator[]> {
        return (await this.data)
            .actuators
            .filter(
                actuator => {
                    if (options.mix !== undefined) {
                        if (actuator.mix !== options.mix) {
                            return false;
                        }
                    }
                    return true;
                }
            );
    }
    
    public async getActuatorByName(name: string): Promise<Actuator | null> {
        return (await this.data).actuators.find(a => a.name === name) ?? null;
    }
    
    public async createActuator(actuator: Actuator, parentName: string | null): Promise<void> {
        const data            = await this.data;
        const alreadyExisting = data.actuators.some(otherActuator => otherActuator.name === actuator.name);
        if (alreadyExisting) {
            throw new ConflictException();
        }
        if (parentName != null) {
            await this.groupService.addDevice(parentName, actuator.name, EntityType.ACTUATOR, false, false);
        }
        data.actuators.push(actuator);
        
        this.saveData();
    }
    
    public async actuatorExists(actuatorName: string): Promise<boolean> {
        return (await this.data).actuators.some(a => a.name === actuatorName);
    }
    
    public async deleteActuator(name: string): Promise<void> {
        const data             = await this.data;
        const actuatorToDelete = data.actuators.find(otherActuator => otherActuator.name === name);
        if (actuatorToDelete == null) {
            throw new NotFoundException();
        }
        const toDeleteIndex = data.actuators.findIndex(otherActuator => otherActuator.name === name);
        if (toDeleteIndex !== -1) {
            data.actuators.splice(toDeleteIndex, 1);
        }
        this.saveData();
    }
    
    public async editActuator(oldName: string, edit: ActuatorEditChanges): Promise<void> {
        const data           = await this.data;
        const newName        = edit.name;
        const actuatorToEdit = data.actuators.find(otherActuator => otherActuator.name === oldName);
        if (actuatorToEdit == null) {
            throw new NotFoundException();
        }
        let alreadyExisting = false;
        if (oldName !== newName) {
            alreadyExisting = data.actuators.some(otherActuator => otherActuator.name === edit.name);
        }
        if (!alreadyExisting) {
            if ((newName != null) && (oldName != newName)) {
                actuatorToEdit.name = newName;
                await this.groupService.actuatorRenamed(oldName, newName);
            }
            if (edit.displayName != null) {
                actuatorToEdit.displayName = edit.displayName;
            }
            if (edit.zigbeeAddress != null) {
                actuatorToEdit.zigbeeAddress = edit.zigbeeAddress;
            }
            if (edit.type != null) {
                actuatorToEdit.type = edit.type;
            }
            if (edit.exposes != null) {
                const exposeChanges = actuatorToEdit.calculateExposesChanges(edit.exposes.map(expose => Datum.fromJSON(expose)));
                // TODO: Cascade effect into mixes
                for (const change of exposeChanges.filter(deletion => deletion.change === DatumChangeType.DELETED)) {
                    const index = actuatorToEdit.exposes.findIndex(otherExpose => otherExpose.name == change.datum.name);
                    if (index != -1) {
                        actuatorToEdit.exposes.splice(index, 1);
                    }
                }
                for (const change of exposeChanges.filter(addition => addition.change === DatumChangeType.NEW)) {
                    actuatorToEdit.exposes.push(change.datum);
                }
            }
            this.saveData();
        } else {
            throw new ConflictException();
        }
    }
    
}


class ActuatorData {
    
    public actuators: Actuator[];
    
    constructor(actuatorDataJSON?: ActuatorDataJSON) {
        if (actuatorDataJSON) {
            this.actuators = actuatorDataJSON.actuators.map((actuatorJSON: ActuatorJSON) => Actuator.fromJSON(actuatorJSON));
        } else {
            this.actuators = [];
        }
    }
    
    public toJSON(): ActuatorDataJSON {
        return {
            actuators: this.actuators.map((actuator: Actuator) => actuator.toJSON())
        };
    }
    
}

interface ActuatorDataJSON {
    actuators: ActuatorJSON[];
}
