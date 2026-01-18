import {Device, DeviceJSON} from "../device";

export class Actuator extends Device {

    public mix: number | null = null;
    
    public override toJSON(): ActuatorJSON {
        return {
            uid: this.uid,
            name: this.name,
            displayName: this.displayName,
            mix: this.mix,
        }
    }
    
    public static override fromJSON(JSON: ActuatorJSON): Actuator {
        const actuator = new Actuator(JSON.uid, JSON.name, JSON.displayName);
        actuator.mix = JSON.mix;
        return actuator;
    }
}

export class ActuatorJSON extends DeviceJSON {
    
    public mix: number | null = null;
    
}

