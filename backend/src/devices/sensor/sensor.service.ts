import {BadRequestException, ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {FileService} from "../../helpers/file/file.service";
import MixService from "../../mixing/mix/mix.service";
import {Sensor, SensorJSON} from "@common/devices/sensor/sensor";
import {GroupService} from "../group/group.service";
import {SensorEditChanges} from "@common/devices/sensor/rest-classes";
import {Datum, DatumChangeType, DatumOrigin} from "@common/mixing/mix/datum";
import {EntityType} from "@common/devices/constants";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {GetDevicesOptions, LockedExposes} from "@common/devices/rest-classes";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";

const SAVE_FILE = "devices/sensor.json";

@Injectable()
export class SensorService extends PersistentDataService<SensorData, SensorDataJSON> {
    
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => GroupService))
        private groupService: GroupService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService
    ) {
        super(fileService, SAVE_FILE, SensorData);
    }
    
    public async getAllSensors(options: GetDevicesOptions = {}): Promise<Sensor[]> {
        if (options.anyMixed != undefined && options.anyMixed) {
            if (options.mix !== undefined) {
                throw new BadRequestException("Either set anyMixed to false/undefined, of do not specify the mix");
            }
        }
        return (await this.data)
            .sensors
            .filter(
                sensor => {
                    if (options.anyMixed === true) {
                        return sensor.mix != null;
                    } else {
                        if (options.mix !== undefined) {
                            if (sensor.mix !== options.mix) {
                                return false;
                            }
                        }
                        return true;
                    }
                }
            );
    }
    
    public async getSensorByName(name: string): Promise<Sensor | null> {
        return (await this.data).sensors.find(a => a.name === name) ?? null;
    }
    
    public async getSensorsByNames(names: string[]): Promise<Sensor[]> {
        return (await this.data).sensors.filter(a => names.includes(a.name));
    }
    
    public async createSensor(sensor: Sensor, parentName: string | null): Promise<void> {
        const data            = await this.data;
        const alreadyExisting = data.sensors.some(otherSensor => otherSensor.name === sensor.name);
        if (alreadyExisting) {
            throw new ConflictException();
        }
        if (parentName != null) {
            await this.groupService.addDevice(parentName, sensor.name, EntityType.SENSOR, false, false);
        }
        data.sensors.push(sensor);
        
        this.saveData();
    }
    
    public async sensorExists(sensorName: string): Promise<boolean> {
        return (await this.data).sensors.some(a => a.name === sensorName);
    }
    
    public async deleteSensor(name: string): Promise<void> {
        const data           = await this.data;
        const sensorToDelete = data.sensors.find(otherSensor => otherSensor.name === name);
        if (sensorToDelete == null) {
            throw new NotFoundException();
        }
        const toDeleteIndex = data.sensors.findIndex(otherSensor => otherSensor.name === name);
        if (toDeleteIndex !== -1) {
            data.sensors.splice(toDeleteIndex, 1);
        }
        this.saveData();
    }
    
    public async editSensor(oldName: string, edit: SensorEditChanges): Promise<void> {
        const data         = await this.data;
        const newName      = edit.name;
        const sensorToEdit = data.sensors.find(otherSensor => otherSensor.name === oldName);
        if (sensorToEdit == null) {
            throw new NotFoundException();
        }
        let alreadyExisting = false;
        if (oldName !== newName) {
            alreadyExisting = data.sensors.some(otherSensor => otherSensor.name === edit.name);
        }
        if (!alreadyExisting) {
            if (edit.exposes != null) {
                const exposeChanges = sensorToEdit.calculateExposesChanges(edit.exposes.map(expose => Datum.fromJSON(expose)));
                for (const change of exposeChanges.filter(deletion => deletion.change === DatumChangeType.DELETED)) {
                    // We have to check the exposes doesn't break any mix connections
                    if (await this.mixService.dependencyExists(DatumOrigin.SENSOR_DATA, sensorToEdit.name, change.datum.name)) {
                        // Cannot delete/edit dependency, it's used somewhere
                        throw new ConflictException(`Cannot delete/edit export ${change.datum.name}, it's used in a mix`);
                    }
                }
                for (const change of exposeChanges.filter(deletion => deletion.change === DatumChangeType.DELETED)) {
                    const index = sensorToEdit.exposes.findIndex(otherExpose => otherExpose.name == change.datum.name);
                    if (index != -1) {
                        sensorToEdit.exposes.splice(index, 1);
                    }
                }
                for (const change of exposeChanges.filter(addition => addition.change === DatumChangeType.NEW)) {
                    sensorToEdit.exposes.push(change.datum);
                }
            }
            let displayChanged = false;
            let nameChanged = false;
            if (edit.displayName != null) {
                displayChanged = sensorToEdit.displayName != edit.displayName;
                sensorToEdit.displayName = edit.displayName;
            }
            if ((newName != null) && (oldName != newName)) {
                sensorToEdit.name = newName;
                nameChanged = true;
                await this.groupService.sensorRenamed(oldName, newName);
            }
            if (displayChanged || nameChanged) {
                await this.mixService.sensorRenamed(oldName, sensorToEdit.name, sensorToEdit.displayName);
            }
            if (edit.zigbeeAddress != null) {
                sensorToEdit.zigbeeAddress = edit.zigbeeAddress;
            }
            if (edit.type != null) {
                sensorToEdit.type = edit.type;
            }
            this.saveData();
        } else {
            throw new ConflictException();
        }
    }
    
    public async setMixForSensor(sensorName: string, mixId: number | "NEW"): Promise<void> {
        if (mixId == "NEW") {
            throw new BadRequestException("Cannot assign a new mix directly");
        }
        const sensor = await this.getSensorByName(sensorName);
        if (sensor == null) {
            throw new NotFoundException(`Cannot find sensor "${sensorName}"`);
        } else {
            if (await this.mixService.getMixById(mixId) == null) {
                throw new NotFoundException(`Cannot find mix with id ${mixId}`);
            }
        }
        sensor.mix = mixId;
        this.saveData();
    }
    
    public async removeMixFromSensor(name: string): Promise<void> {
        const sensor = await this.getSensorByName(name);
        if (sensor == null) {
            throw new NotFoundException(`Cannot find sensor "${name}"`);
        }
        sensor.mix = null;
        this.saveData();
    }
    
    public async getLockedExposes(name: string): Promise<LockedExposes[]> {
        const sensor = await this.getSensorByName(name);
        if (sensor == null) {
            throw new NotFoundException(`Cannot find sensor "${name}"`);
        }
        const result: LockedExposes[] = [];
        for (const exposes of sensor.exposes) {
            const depending = await this.mixService.getDependingMixes(DatumOrigin.SENSOR_DATA, sensor.name, exposes.name);
            if (depending.length > 0) {
                const positions: MixPositionInfo[] = [];
                for (const mix of depending) {
                    if (mix.id != "NEW") {
                        positions.push(await this.mixService.getMixPosition(mix.id));
                    }
                }
                result.push({
                                name:         exposes.name,
                                dependencies: positions
                            })
            }
        }
        return result;
    }
    
}


class SensorData {
    
    public sensors: Sensor[];
    
    constructor(sensorDataJSON?: SensorDataJSON) {
        if (sensorDataJSON) {
            this.sensors = sensorDataJSON.sensors.map((sensorJSON: SensorJSON) => Sensor.fromJSON(sensorJSON));
        } else {
            this.sensors = [];
        }
    }
    
    public toJSON(): SensorDataJSON {
        return {
            sensors: this.sensors.map((sensor: Sensor) => sensor.toJSON())
        };
    }
    
}

interface SensorDataJSON {
    sensors: SensorJSON[];
}
