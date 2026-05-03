/**
 * This module contains the {@link SettingsService|`SettingsService`} class, handling the business logic for {@link SystemSettings|`SystemSettings`}.
 *
 * @module
 */
import {Injectable} from "@nestjs/common";
import {FileService} from "../../helpers/file/file.service";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {SystemSettings, SystemSettingsJSON} from "@common/system/settings/settings";
import {ZigbeeService} from "../../zigbee/zigbee.service";
import {DeviceMonitorService} from "../device-monitor/device-monitor.service";

/**
 * The path of the file where to save the data about the {@link SettingsService|`SettingsService`}.
 */
const SAVE_FILE = "system/settings.json";

/**
 * This service handles the business logic for {@link SystemSettings|`SystemSettings`}.
 *
 * It offers the function to retrieve and save values of the {@link SystemSettings|`SystemSettings`},
 * and propagates the changed values through the system setting the correct properties in the relevant
 * services.
 */
@Injectable()
export class SettingsService extends PersistentDataService<SettingsData, SettingsDataJSON> {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {FileService} fileService - The service handling persistent storage. Instantiated by dependency injection.
     */
    constructor(
        fileService: FileService
    ) {
        super(fileService, SAVE_FILE, SettingsData);
        this.doAfterLoad((data) => {
            this.sendChanges(data.settings.toJSON());
        });
    }
    
    /**
     * Update the system {@link SystemSettings|`SystemSettings`} with the given settings.
     *
     * @param {SystemSettingsJSON} settingsUpdate - The new system settings. Unchanged values can be omitted.
     * @returns {Promise<SystemSettings>} The updated {@link SystemSettings|`SystemSettings`}.
     */
    public async updateSettings(settingsUpdate: SystemSettingsJSON): Promise<SystemSettings> {
        const data = await this.data;
        data.settings.update(settingsUpdate);
        this.sendChanges(settingsUpdate);
        this.saveData();
        return data.settings;
    }
    
    /**
     * Get the saved value for {@link SystemSettings|`SystemSettings`}.
     *
     * @returns {Promise<SystemSettings>} The resulting {@link SystemSettings|`SystemSettings`}.
     */
    public async getSettings(): Promise<SystemSettings> {
        const data = await this.data;
        return data.settings;
    }
    
    /**
     * This function propagates the effects of the new settings throughout the system.
     *
     * @param {SystemSettingsJSON} settingsUpdate - The new system settings. Unchanged values can be omitted.
     */
    private sendChanges(settingsUpdate: SystemSettingsJSON): void {
        
        if (settingsUpdate.offlineCheck != null) {
            DeviceMonitorService.offlineCheck = settingsUpdate.offlineCheck;
        }
        if (settingsUpdate.onlineCheck != null) {
            DeviceMonitorService.onlineCheck = settingsUpdate.onlineCheck;
        }
        if (settingsUpdate.unavailableTimeout != null) {
            DeviceMonitorService.unavailableTimeout = settingsUpdate.unavailableTimeout;
        }
        if (settingsUpdate.throttleTiming != null) {
            ZigbeeService.throttleTiming = settingsUpdate.throttleTiming;
        }
    }
    
}

/**
 * The persistent data structure used by {@link SettingsService|`SettingsService`}
 * for persisting data about the {@link SystemSettings|`SystemSettings`}.
 */
export class SettingsData {
    /**
     * The system settings.
     */
    public settings: SystemSettings;

    /**
     * Creates an instance of the class from its serialization.
     *
     * @param {SettingsDataJSON} settingsDataJSON - The serialization of the class to recreate into an instance of the class.
     */
    constructor(settingsDataJSON?: SettingsDataJSON) {
        if (settingsDataJSON) {
            this.settings = SystemSettings.fromJSON(settingsDataJSON.settings);
        } else {
            this.settings = new SystemSettings();
        }
    }

    /**
     * Converts the settings data instance into its JSON representation.
     *
     * @returns {SettingsDataJSON} The JSON representation of `this`.
     */
    public toJSON(): SettingsDataJSON {
        return {
            settings: this.settings.toJSON()
        };
    }
}

/**
 * The serialization of the class {@link SettingsData|`SettingsData`}.
 */
export interface SettingsDataJSON {
    /**
     * Serialization of the property {@link SettingsData#settings|`settings`}.
     */
    settings: SystemSettingsJSON;
}
