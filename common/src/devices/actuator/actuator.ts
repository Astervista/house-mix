/**
 * This module contains classes relative to a specific class of devices called actuators,
 * devices that receive a command from the system and change something in the physical world accordingly.
 *
 * @module
 */
import {Device, DeviceJSON} from "../device";
import {IsEnum} from "rest-decorators";
import {Datum} from "../../mixing/mix/datum";

/**
 * Represents an actuating device, extending the base `Device` functionality
 * and introducing specific properties and methods related to actuators.
 *
 * An actuator device is a device for which the properties of {@link Actuator#exposes|`exposes`}
 * can be sent to the `/{`{@link Actuator#zigbeeAddress|`zigbeeAddress`}`}/set` zigbee2mqtt topic
 * to change the behavior of the zigbee device, such as changing the brightness of a lamp
 * or the state of a relay.
 */
export class Actuator extends Device {
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - Same as in {@link Device| `new Device()`}.
     * @param {string} displayName - Same as in {@link Device| `new Device()`}.
     * @param {ActuatorType} type - The {@link ActuatorType|type} of the actuator.
     * @param {string} zigbeeAddress - Same as in {@link Device| `new Device()`}.
     */
    constructor(
        name: string,
        displayName: string,
        public type: ActuatorType,
        zigbeeAddress: string
    ) {
        super(zigbeeAddress, name, displayName);
    }
    
    
    /**
     * This is the list of attributes that are used to communicate to the device. Elements of this
     * array are the only ones that the {@link Actuator#mix|`Mix`} attached to this actuator
     * can export, and in the calculation of the main cycle the values of those exports will be
     * sent as property of the JSON payload to the `/{`{@link Actuator#zigbeeAddress|`zigbeeAddress`}`}/set`
     * zigbee2mqtt topic.
     */
    public override readonly exposes: Datum[] = [];
    
    
    /**
     * Converts the actuator instance into its JSON representation.
     *
     * @returns {ActuatorJSON} The JSON representation of `this`.
     */
    public override toJSON(): ActuatorJSON {
        const parentJSON = super.toJSON();
        return {
            zigbeeAddress: parentJSON.zigbeeAddress,
            name:          parentJSON.name,
            displayName:   parentJSON.displayName,
            exposes:       parentJSON.exposes,
            mix:           this.mix,
            type:          this.type
        };
    }
    
    /**
     * Constructs a new {@link Actuator|`Actuator`} instance from a given JSON representation.
     *
     * @param {ActuatorJSON} actuatorJSON - The JSON representation of the actuator.
     * @returns {Actuator} The actuator object constructed from the provided JSON.
     */
    public static override fromJSON(actuatorJSON: ActuatorJSON): Actuator {
        let type = ActuatorType.UNKNOWN;
        if (actuatorJSON.type in ActuatorType) {
            type = actuatorJSON.type as ActuatorType;
        }
        const parent   = Device.fromJSON(actuatorJSON);
        const actuator = new Actuator(parent.name, parent.displayName, type, parent.zigbeeAddress);
        actuator.exposes.push(...parent.exposes);
        actuator.mix = parent.mix;
        return actuator;
    }
}

/**
 * Enum representing different types of actuators that can be controlled
 * within the system.
 *
 * @readonly
 */
export enum ActuatorType {
    /** Represents a point light, like a lightbulb. */
    BULB    = "BULB",
    /** Represents a smart plug. */
    PLUG    = "PLUG",
    /** Represents a relay. */
    RELAY   = "RELAY",
    /** Represents a light with a linear form factor, like an LED strip. */
    STRIP   = "STRIP",
    /** Represents an actuator to reproduce a sound, like a doorbell. */
    BELL    = "BELL",
    /** Represents an actuator for controlling curtains or blinds. */
    CURTAIN = "CURTAIN",
    /** Represents an actuator that controls water mechanisms, such as a smart valve. */
    WATER   = "WATER",
    /**
     * Represents an actuator of any other type, in case the user doesn't
     * find the available types satisfactory.
     */
    OTHER   = "OTHER",
    /**
     * Represents an actuator with an unknown type. This is a fallback for
     * when a value is not recognized (possibly from later versions, or
     * tampering/corruption of the data).
     */
    UNKNOWN = "UNKNOWN",
}

/**
 * The serialization of the class {@link Actuator|`Actuator`}.
 */
export class ActuatorJSON extends DeviceJSON {
    
    /**
     * Serialization of the property {@link Actuator#type|`Actuator.type`}.
     */
    @IsEnum(ActuatorType)
    public type: string = ActuatorType.UNKNOWN;
    
}
