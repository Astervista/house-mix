/**
 * This module contains classes regarding a generic {@link Device|`Device`}, a device connected to the
 * zigbee network.
 *
 * @module
 */
import {IsArray, IsInt, IsNotEmpty, Matches, Min, Type, ValidateIf, ValidateNested} from "rest-decorators";
import {Datum, DatumChange, DatumChangeType, DatumJSON} from "../mixing/mix/datum";
import {UNIQUE_NAME_PATTERN} from "../utils/constants";

// noinspection ES6UnusedImports
import type {Sensor} from "./sensor/sensor";
// noinspection ES6UnusedImports
import type {Actuator} from "./actuator/actuator";

/**
 * This is the class that models a generic device connected to the Zigbee network.
 *
 * This is a non-specific class that represents any device with the common attributes
 * and methods. For specific functionalities, refer to the classes {@link Actuator|`Actuator`}
 * and {@link Sensor|`Sensor`} which are the inheritors of this class.
 */
export class Device {
    
    /**
     * The mix relative to this device. Depending on the type of device, the mix's inputs and outputs
     * may be restricted.
     * For example, for {@link Actuator|`Actuator`s} the outputs must match the one defined in {@link Device#exposes|`Device.exposes`},
     * while for {@link Sensor|`Sensor`s} the inputs must either match the one defined in {@link Device#exposes|`Device.exposes`}, or
     * be some data coming from the system.
     */
    public mix: number | null = null;
    
    /**
     * This is the list of exposed properties, attributes that are used to communicate to the device, as properties of the
     * JSON object sent or received from the device through MQTT.
     */
    public readonly exposes: Datum[] = [];
    
    /**
     * Constructs an instance of the class.
     *
     * @param {string} _zigbeeAddress - The 8-byte (64-bit) address (in hex, **without** the `0x` prefix) of this device in the Zigbee network.
     * @param {string} name - The unique name of this device. It must follow the {@link UNIQUE_NAME_PATTERN | `/^([a-z\-0-9_]+)$/`} pattern.
     * @param {string} displayName - The name with which the device is shown in the frontend UI.
     */
    constructor(private _zigbeeAddress: string, public name: string, public displayName: string) {
        this.zigbeeAddress = _zigbeeAddress;
    }
    
    /**
     * The 8-byte (64-bit) address (in hex, **without** the `0x` prefix) of this device in the Zigbee network.
     */
    public get zigbeeAddress(): string {
        return this._zigbeeAddress.toLowerCase();
    }
    
    /**
     * Updates the 8-byte (64-bit) address (in hex, **without** the `0x` prefix) of this device in the Zigbee network.
     * Setting this will transform the value to lowercase.
     */
    public set zigbeeAddress(value: string) {
        this._zigbeeAddress = value.toLowerCase();
    }
    
    /**
     * Compares the current list of exposes with a new list and identifies changes such as deleted or new elements.
     * Change in {@link Datum#type|`Datum.type`} or {@link Datum#nullable|`Datum.nullable`} are considered as a
     * {@link DatumChangeType.DELETED|`DELETED`} followed by a {@link DatumChangeType.NEW|`NEW`}.
     *
     * @param {Datum[]} newExposes - The new array of Datum objects to compare against the existing ones.
     * @returns {DatumChange[]} An array of {@link DatumChange|`DatumChange`} objects representing the detected changes.
     */
    public calculateExposesChanges(newExposes: Datum[]): DatumChange[] {
        const changes: DatumChange[] = [];
        for (const oldExpose of this.exposes) {
            const newVersion = newExposes.find(a => a.name === oldExpose.name);
            if (newVersion == null) {
                changes.push(new DatumChange(DatumChangeType.DELETED, oldExpose));
            } else {
                if (newVersion.type !== oldExpose.type || newVersion.nullable !== oldExpose.nullable) {
                    changes.push(new DatumChange(DatumChangeType.DELETED, oldExpose));
                    changes.push(new DatumChange(DatumChangeType.NEW, newVersion));
                }
            }
        }
        for (const newExpose of newExposes) {
            if (!this.exposes.some(a => a.name === newExpose.name)) {
                changes.push(new DatumChange(DatumChangeType.NEW, newExpose));
            }
        }
        return changes;
    }
    
    /**
     * Converts the device instance into its JSON representation.
     *
     * @returns {DeviceJSON} The JSON representation of `this`.
     */
    public toJSON(): DeviceJSON {
        return {
            zigbeeAddress: this.zigbeeAddress,
            name:          this.name,
            displayName:   this.displayName,
            exposes:       this.exposes.map(datum => datum.toJSON()),
            mix:           this.mix
        };
    }
    
    /**
     * Constructs a new Device instance from a given JSON representation.
     *
     * @param {DeviceJSON} deviceJSON - The JSON representation of the device.
     * @returns {Device} The Device object constructed from the provided JSON.
     */
    public static fromJSON(deviceJSON: DeviceJSON): Device {
        const device = new Device(deviceJSON.zigbeeAddress, deviceJSON.name, deviceJSON.displayName);
        device.mix = deviceJSON.mix;
        device.exposes.push(...deviceJSON.exposes.map(exposed => Datum.fromJSON(exposed)));
        return device;
    }
}

/**
 * The serialization of the class {@link Device|`Device`}.
 */
export class DeviceJSON {
    
    /**
     * Serialization of the property {@link Device#zigbeeAddress|`Device.zigbeeAddress`}.
     */
    @IsNotEmpty()
    @Matches(/^[0-9a-f]+$/)
    public zigbeeAddress: string;
    
    /**
     * Serialization of the property {@link Device#name|`Device.name`}.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    /**
     * Serialization of the property {@link Device#displayName|`Device.displayName`}.
     */
    @IsNotEmpty()
    public displayName: string;
    
    /**
     * Serialization of the property {@link Device#exposes|`Device.exposes`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumJSON)
    public exposes: DatumJSON[] = [];
    
    /**
     * Serialization of the property {@link Device#mix|`Device.mix`}.
     */
    @ValidateIf((o: DeviceJSON) => o.mix !== null)
    @IsInt()
    @Min(0)
    public mix: number | null = null;
    
    /**
     * Constructs an instance of the class.
     *
     * @param {string} zigbeeAddress - Value for {@link DeviceJSON#zigbeeAddress|`zigbeeAddress`}.
     * @param {string} name - Value for {@link DeviceJSON#name|`name`}.
     * @param {string} displayName - Value for {@link DeviceJSON#displayName|`displayName`}.
     */
    constructor(zigbeeAddress: string, name: string, displayName: string) {
        this.zigbeeAddress = zigbeeAddress;
        this.name          = name;
        this.displayName   = displayName;
    }
}
