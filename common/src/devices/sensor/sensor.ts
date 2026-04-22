/**
 * This module contains classes relative to a specific class of devices called sensors,
 * devices that read data from the physical world and send it to the system.
 *
 * @module
 */
import {Device, DeviceJSON} from "../device";
import {Datum} from "../../mixing/mix/datum";
import {IsEnum} from "rest-decorators";

// noinspection ES6UnusedImports
import type {Mix} from "../../mixing/mix/mix";

/**
 * Represents a sensing device, extending the base `Device` functionality
 * and introducing specific properties and methods related to sensors.
 *
 * A sensor device is a device for which the properties of {@link Sensor#exposes|`exposes`}
 * are listened for on the `/{`{@link Sensor#zigbeeAddress|`zigbeeAddress`}`}` zigbee2mqtt topic
 * to be used in {@link Mix|´Mix`es} for the elaboration, for example the temperature or
 * movement.
 */
export class Sensor extends Device {
    
    /**
     * Constructs an instance of the class.
     *
     * @param {string} name - Same as in {@link Device|`new Device()`}.
     * @param {string} displayName - Same as in {@link Device|`new Device()`}.
     * @param {SensorType} type - The {@link SensorType|type} of the sensor.
     * @param {string} zigbeeAddress - Same as in {@link Device|`new Device()`}.
     */
    constructor(
        name: string,
        displayName: string,
        public type: SensorType,
        zigbeeAddress: string
    ) {
        super(zigbeeAddress, name, displayName);
    }
    
    /**
     * This is the list of attributes corresponding to the status properties that the device
     * publishes. Elements of this array are the available sensor values that can be imported by the {@link Sensor#mix|`Mix`}
     * regarding this sensor, which are read from the `/{`{@link Sensor#zigbeeAddress|`zigbeeAddress`}`}/`
     * zigbee2mqtt topic as a property of the JSON in its payload.
     */
    public override readonly exposes: Datum[] = [];
    
    /**
     * Converts the sensor instance into its JSON representation.
     *
     * @returns {SensorJSON} The JSON representation of `this`.
     */
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
    
    /**
     * Constructs a new {@link Sensor|`Sensor`} instance from a given JSON representation.
     *
     * @param {SensorJSON} sensorJSON - The JSON representation of the sensor.
     * @returns {Sensor} The sensor object constructed from the provided JSON.
     */
    public static override fromJSON(sensorJSON: SensorJSON): Sensor {
        let type = SensorType.UNKNOWN;
        if (sensorJSON.type in SensorType) {
            type = sensorJSON.type as SensorType;
        }
        const parent = Device.fromJSON(sensorJSON);
        const sensor = new Sensor(parent.name, parent.displayName, type, parent.zigbeeAddress);
        sensor.exposes.push(...parent.exposes);
        sensor.mix = parent.mix;
        return sensor;
    }
}

/**
 * Enum representing different types of sensor that can be listened for
 * within the system.
 *
 * @readonly
 */
export enum SensorType {
    /** A physical button or switch. */
    BUTTON = "BUTTON",
    /** An ambient light or illuminance sensor. */
    LIGHT = "LIGHT",
    /** A rotary encoder or dimmer switch. */
    ROTARY = "ROTARY",
    /** A passive infrared (PIR) or occupancy sensor. */
    MOVEMENT             = "MOVEMENT",
    /** A dedicated temperature sensor. */
    TEMPERATURE          = "TEMPERATURE",
    /** A dedicated humidity sensor. */
    HUMIDITY             = "HUMIDITY",
    /** A combined sensor providing both humidity and temperature data. */
    HUMIDITY_TEMPERATURE = "HUMIDITY_TEMPERATURE",
    /** A contact sensor for doors or windows. */
    DOOR                 = "DOOR",
    /** A smoke or fire detection sensor. */
    SMOKE                = "SMOKE",
    /**
     * Represents a sensor of any other type, in case the user doesn't
     * find the available types satisfactory.
     */
    OTHER                = "OTHER",
    /**
     * Represents a sensor with an unknown type. This is a fallback for
     * when a value is not recognized (possibly from later versions, or
     * tampering/corruption of the data).
     */
    UNKNOWN = "UNKNOWN",
}

/**
 * The serialization of the class {@link Sensor|`Sensor`}.
 */
export class SensorJSON extends DeviceJSON {
    
    /**
     * Serialization of the property {@link Sensor#type|`Sensor.type`}.
     */
    @IsEnum(SensorType)
    public type: string = SensorType.UNKNOWN;
    
}
