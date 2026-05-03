/**
 * This module contains {@link DeviceMonitorDevice|`DeviceMonitorDevice`} and the related classes,
 * to define devices in the network and their connection status.
 *
 * @module
 */
import {IsBoolean, IsIP, IsNotEmpty, IsOptional, IsString} from "rest-decorators";

// noinspection ES6UnusedImports
import type {Device} from "../../devices/device";

/**
 * This class defines a device on the network that is monitored for its connection status.
 *
 * These devices are normal devices that are connected to the LAN, like computer or smartphones, not
 * smart home {@link Device|`Device`s} connected through mqtt or zigbee. They can be monitored by the
 * specific section in the system view on the frontend.
 */
export class DeviceMonitorDevice {
    
    /**
     * Creates an instance of the class.
     *
     * @param {string | undefined} ip - The ip of the device on the network.
     * @param {string} name - A unique name to give to the device (different from the {@link Device#name|`name`} of a device in the system).
     * @param {boolean | null} connected - Whether the device is connected to the network or not. `null` for unknown status.
     */
    constructor(
        public ip: string | undefined,
        public name: string,
        public connected: boolean | null = null) {
    
    }
    
    /**
     * Converts the device to monitor instance into its JSON representation.
     *
     * @returns {DeviceMonitorDeviceJSON} The JSON representation of `this`.
     */
    public toJSON(): DeviceMonitorDeviceJSON {
        return new DeviceMonitorDeviceJSON(this.ip, this.name, this.connected ?? undefined);
    }
    
    /**
     * Constructs a new {@link DeviceMonitorDevice|`DeviceMonitorDevice`} instance from a given JSON representation.
     *
     * @param {DeviceMonitorDeviceJSON} deviceMonitorDeviceJSON - The JSON representation of the device to monitor.
     * @returns {DeviceMonitorDevice} The device to monitor object constructed from the provided JSON.
     */
    public static fromJSON(deviceMonitorDeviceJSON: DeviceMonitorDeviceJSON): DeviceMonitorDevice {
        return new DeviceMonitorDevice(
            deviceMonitorDeviceJSON.ip,
            deviceMonitorDeviceJSON.name,
            deviceMonitorDeviceJSON.connected
        );
    }
    
}

/**
 * The serialization of the class {@link DeviceMonitorDevice|`DeviceMonitorDevice`}.
 */
export class DeviceMonitorDeviceJSON {
    
    
    /**
     * Serialization of the property {@link DeviceMonitorDevice#ip|`ip`}.
     */
    @IsIP(4)
    public ip?: string;
    
    /**
     * Serialization of the property {@link DeviceMonitorDevice#name|`name`}.
     */
    @IsString()
    @IsNotEmpty()
    public name: string;
    
    /**
     * Serialization of the property {@link DeviceMonitorDevice#connected|`connected`}.
     */
    @IsOptional()
    @IsBoolean()
    public connected?: boolean;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string | undefined} ip - Value for {@link DeviceMonitorDevice#ip|`ip`}.
     * @param {string} name - Value for {@link DeviceMonitorDevice#name|`name`}.
     * @param {boolean} connected - Value for {@link DeviceMonitorDevice#connected|`connected`}.
     */
    constructor(ip: string | undefined, name: string, connected?: boolean) {
        this.ip        = ip;
        this.name      = name;
        this.connected = connected;
    }
    
}
