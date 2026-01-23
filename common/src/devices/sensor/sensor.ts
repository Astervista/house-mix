import {Device, DeviceJSON} from "../device";
import {Datum} from "../../mixing/mix/datum";
import {IsEnum, IsInt, IsPositive, ValidateIf } from "rest-decorators";

export class Sensor extends Device {

    public mix: number | null = null;
    
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
    
    public static override fromJSON(actuatorJSON: SensorJSON): Sensor {
        let type = SensorType.UNKNOWN;
        if (actuatorJSON.type in SensorType) {
            type = actuatorJSON.type as SensorType;
        }
        const parent = Device.fromJSON(actuatorJSON);
        const actuator = new Sensor(parent.name, parent.displayName, type, parent.zigbeeAddress);
        actuator.exposes.push(...actuatorJSON.exposes.map(exposed => Datum.fromJSON(exposed)));
        actuator.mix = actuatorJSON.mix;
        return actuator;
    }
}

export enum SensorType {
    BUTTON = "BUTTON",
    LIGHT = "LIGHT",
    ROTARY = "ROTARY",
    UNKNOWN = "UNKNOWN",
}

export class SensorJSON extends DeviceJSON {
    
    @ValidateIf((o: SensorJSON) => o.mix !== null)
    @IsInt()
    @IsPositive()
    public mix: number | null = null;
    
    @IsEnum(SensorType)
    public type: string = SensorType.UNKNOWN;
    
}
