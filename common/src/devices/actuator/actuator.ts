import {Device, DeviceJSON} from "../device";
import {Datum} from "../../mixing/mix/datum";
import {IsEnum, IsInt, IsPositive, ValidateIf} from "rest-decorators";

export class Actuator extends Device {
    
    public mix: number | null = null;
    
    constructor(
        name: string,
        displayName: string,
        public type: ActuatorType,
        zigbeeAddress: string
    ) {
        super(zigbeeAddress, name, displayName);
    }
    
    public override toJSON(): ActuatorJSON {
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
    
    public static override fromJSON(actuatorJSON: ActuatorJSON): Actuator {
        let type = ActuatorType.UNKNOWN;
        if (actuatorJSON.type in ActuatorType) {
            type = actuatorJSON.type as ActuatorType;
        }
        const parent = Device.fromJSON(actuatorJSON);
        const actuator = new Actuator(parent.name, parent.displayName, type, parent.zigbeeAddress);
        actuator.exposes.push(...actuatorJSON.exposes.map(exposed => Datum.fromJSON(exposed)));
        actuator.mix = actuatorJSON.mix;
        return actuator;
    }
}

export enum ActuatorType {
    BULB = "BULB",
    STRIP = "STRIP",
    UNKNOWN = "UNKNOWN",
}

export class ActuatorJSON extends DeviceJSON {
    
    @ValidateIf((o: ActuatorJSON) => o.mix !== null)
    @IsInt()
    @IsPositive()
    public mix: number | null = null;
    
    @IsEnum(ActuatorType)
    public type: string = ActuatorType.UNKNOWN;
    
}
