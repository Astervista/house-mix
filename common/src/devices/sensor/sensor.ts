import {Device, DeviceJSON} from "../device";
import {Datum} from "../../mixing/mix/datum";
import {IsEnum} from "rest-decorators";

export class Sensor extends Device {
    
    constructor(
        name: string,
        displayName: string,
        public type: SensorType,
        zigbeeAddress: string
    ) {
        super(zigbeeAddress, name, displayName);
    }
    
    public override toJSON(): SensorJSON {
        const parentJSON = super.toJSON();
        return {
            zigbeeAddress: parentJSON.zigbeeAddress,
            name: parentJSON.name,
            displayName: parentJSON.displayName,
            exposes: parentJSON.exposes,
            mix: this.mix,
            type: this.type
        }
    }
    
    public static override fromJSON(sensorJSON: SensorJSON): Sensor {
        let type = SensorType.UNKNOWN;
        if (sensorJSON.type in SensorType) {
            type = sensorJSON.type as SensorType;
        }
        const parent = Device.fromJSON(sensorJSON);
        const sensor = new Sensor(parent.name, parent.displayName, type, parent.zigbeeAddress);
        sensor.exposes.push(...sensorJSON.exposes.map(exposed => Datum.fromJSON(exposed)));
        sensor.mix = parent.mix;
        return sensor;
    }
}

export enum SensorType {
    BUTTON = "BUTTON",
    LIGHT = "LIGHT",
    ROTARY = "ROTARY",
    MOVEMENT             = "MOVEMENT",
    TEMPERATURE          = "TEMPERATURE",
    HUMIDITY             = "HUMIDITY",
    HUMIDITY_TEMPERATURE = "HUMIDITY_TEMPERATURE",
    DOOR                 = "DOOR",
    SMOKE                = "SMOKE",
    OTHER                = "OTHER",
    UNKNOWN = "UNKNOWN",
}

export class SensorJSON extends DeviceJSON {
    
    @IsEnum(SensorType)
    public type: string = SensorType.UNKNOWN;
    
}
