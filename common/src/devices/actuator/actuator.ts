import {Device, DeviceJSON} from "../device";
import {Datum} from "../../mixing/mix/datum";

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

export class ActuatorJSON extends DeviceJSON {
    
    // TODO: Checking
    public mix: number | null = null;
    
    public type: string = ActuatorType.UNKNOWN;
    
}

export enum ActuatorType {
    BULB = "BULB",
    STRIP = "STRIP",
    UNKNOWN = "UNKNOWN",
}
