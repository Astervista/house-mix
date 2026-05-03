/**
 * This module contains {@link SystemSettings|`SystemSettings`} and the related classes, to define
 * all the settings or customization of the whole system.
 *
 * @module
 */
import {IsInt, IsNotEmpty, IsOptional, IsString, Max, Min} from "rest-decorators";

// noinspection ES6UnusedImports
import type {DeviceMonitorDevice} from "../device-monitor/device-monitor-device";

/**
 * This is a representation of all the settings and customization regarding the whole system. These are the settings
 * that can be changed in the system > settings view in the frontend, but are only the subset of those that don't remain
 * local to the system.
 */
export class SystemSettings {
    
    /** The name of the home the system is attached to. It's the name seen in the header of any frontend page. */
    public homeName: string           = "Home";
    /**
     * The interval (seconds) at which {@link DeviceMonitorDevice|`devices monitored in the network`} are checked for disconnection.
     * This applies only to devices already online.
     */
    public offlineCheck: number       = 180;
    /**
     * The interval (seconds) at which {@link DeviceMonitorDevice|`device monitored in the network`} are checked for reconnection.
     * This applies only to devices that are offline.
     */
    public onlineCheck: number        = 60;
    /** How much time (seconds) after a device is first detected offline needs to pass for it to be considered not available. */
    public unavailableTimeout: number = 300;
    /**
     * To avoid collisions, the system throttles zigbee messages on mqtt so that there is a minimum gap between them. This is the length
     * of the minimum gap, in milliseconds.
     */
    public throttleTiming: number     = 30;
    
    /**
     * Update the current settings.
     *
     * @param {SystemSettingsJSON} update - The new values.
     */
    public update(update: SystemSettingsJSON): void {
        if (update.homeName != null) {
            this.homeName = update.homeName;
        }
        if (update.offlineCheck != null) {
            this.offlineCheck = update.offlineCheck;
        }
        if (update.onlineCheck != null) {
            this.onlineCheck = update.onlineCheck;
        }
        if (update.unavailableTimeout != null) {
            this.unavailableTimeout = update.unavailableTimeout;
        }
        if (update.throttleTiming != null) {
            this.throttleTiming = update.throttleTiming;
        }
    }
    
    /**
     * Converts the system settings instance into its JSON representation.
     *
     * @returns {SystemSettingsJSON} The JSON representation of `this`.
     */
    public toJSON(): SystemSettingsJSON {
        return {
            homeName:           this.homeName,
            offlineCheck:       this.offlineCheck,
            onlineCheck:        this.onlineCheck,
            unavailableTimeout: this.unavailableTimeout,
            throttleTiming:     this.throttleTiming
        };
    }
    
    /**
     * Constructs a new {@link SystemSettings|`SystemSettings`} instance from a given JSON representation.
     *
     * @param {SystemSettingsJSON} systemSettingsJSON - The JSON representation of the system settings.
     * @returns {SystemSettings} The system settings object constructed from the provided JSON.
     */
    public static fromJSON(systemSettingsJSON: SystemSettingsJSON): SystemSettings {
        const result = new SystemSettings();
        result.update(systemSettingsJSON);
        return result;
        
    }
    
}

/**
 * The serialization of the class {@link SystemSettings|`SystemSettings`}.
 */
export class SystemSettingsJSON {
    
    /**
     * Serialization of the property {@link SystemSettings#homeName|`homeName`}.
     */
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    public homeName?: string;
    
    /**
     * Serialization of the property {@link SystemSettings#offlineCheck|`offlineCheck`}.
     */
    @IsInt()
    @Min(10)
    @Max(3600)
    @IsOptional()
    public offlineCheck?: number;
    
    /**
     * Serialization of the property {@link SystemSettings#onlineCheck|`onlineCheck`}.
     */
    @IsInt()
    @Min(10)
    @Max(3600)
    @IsOptional()
    public onlineCheck?: number;
    
    /**
     * Serialization of the property {@link SystemSettings#unavailableTimeout|`unavailableTimeout`}.
     */
    @IsInt()
    @Min(10)
    @Max(86399)
    @IsOptional()
    public unavailableTimeout?: number;
    
    /**
     * Serialization of the property {@link SystemSettings#throttleTiming|`throttleTiming`}.
     */
    @IsInt()
    @Min(0)
    @Max(1000)
    @IsOptional()
    public throttleTiming?: number;
    
}
