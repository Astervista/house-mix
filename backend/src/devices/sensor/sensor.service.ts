import {ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {FileService} from "../../helpers/file/file.service";
import {MixService} from "../../mixing/mix/mix.service";
import {Sensor, SensorJSON} from "@common/devices/sensor/sensor";
import {GroupService} from "../group/group.service";
import {SensorEditChanges} from "@common/devices/sensor/rest-classes";
import {Datum, DatumChangeType} from "@common/mixing/mix/datum";
import {EntityType} from "@common/devices/constants";

const SAVE_FILE = "devices/sensor.json";

@Injectable()
export class SensorService {
    
    private readonly sensorData: Promise<SensorData>;
    
    constructor(
        private fileService: FileService,
        @Inject(forwardRef(() => GroupService))
        private groupService: GroupService,
        private mixService: MixService,
    ) {
        this.sensorData = fileService
            .readDataFile<SensorDataJSON>(SAVE_FILE)
            .then((data: SensorDataJSON | null) => {
                if (data != null) {
                    return new SensorData(data);
                } else {
                    return new SensorData();
                }
            });
    }
    
    public async getAllSensors(): Promise<Sensor[]> {
        return (await this.sensorData).sensors.slice();
    }
    
    public async getSensorByName(name: string): Promise<Sensor | null> {
        return (await this.sensorData).sensors.find(a => a.name === name) ?? null;
    }
    
    public async createSensor(sensor: Sensor, parentName: string | null): Promise<void> {
        const data = await this.sensorData;
        const alreadyExisting = data.sensors.some(otherSensor => otherSensor.name === sensor.name);
        if (alreadyExisting) {
            throw new ConflictException();
        }
        if (parentName != null) {
            await this.groupService.addDevice(parentName, sensor.name, EntityType.SENSOR, false, false);
        }
        data.sensors.push(sensor);
        
        this.saveData(data)
    }
    
    public async sensorExists(sensorName: string): Promise<boolean> {
        return (await this.sensorData).sensors.some(a => a.name === sensorName);
    }
    
    public async deleteSensor(name: string): Promise<void> {
        const data = await this.sensorData;
        const sensorToDelete = data.sensors.find(otherSensor => otherSensor.name === name);
        if (sensorToDelete == null) {
            throw new NotFoundException();
        }
        const toDeleteIndex = data.sensors.findIndex(otherSensor => otherSensor.name === name);
        if (toDeleteIndex !== -1) {
            data.sensors.splice(toDeleteIndex, 1);
        }
        this.saveData(data);
    }
    
    public async editSensor(oldName: string, edit: SensorEditChanges): Promise<void> {
        const data        = await this.sensorData;
        const newName     = edit.name;
        const sensorToEdit = data.sensors.find(otherSensor => otherSensor.name === oldName);
        if (sensorToEdit == null) {
            throw new NotFoundException();
        }
        let alreadyExisting = false;
        if (oldName !== newName) {
            alreadyExisting = data.sensors.some(otherSensor => otherSensor.name === edit.name);
        }
        if (!alreadyExisting) {
            if ((newName != null) && (oldName != newName)) {
                sensorToEdit.name = newName;
                await this.groupService.sensorRenamed(oldName, newName);
            }
            if (edit.displayName != null) {
                sensorToEdit.displayName = edit.displayName;
            }
            if (edit.zigbeeAddress != null) {
                sensorToEdit.zigbeeAddress = edit.zigbeeAddress;
            }
            if (edit.type != null) {
                sensorToEdit.type = edit.type
            }
            if (edit.exposes != null) {
                const exposeChanges = sensorToEdit.calculateExposesChanges(edit.exposes.map(expose => Datum.fromJSON(expose)));
                // TODO: Cascade effect into mixes
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
            this.saveData(data);
        } else {
            throw new ConflictException();
        }
    }
    
    private saveData(data: SensorData): void {
        void this.fileService.saveDataFile(SAVE_FILE, data.toJSON());
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
            sensors: this.sensors.map((sensor: Sensor) => sensor.toJSON()),
        }
    }

}

interface SensorDataJSON {
    sensors: SensorJSON[];
}
