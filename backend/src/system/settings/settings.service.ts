import {Injectable} from "@nestjs/common";
import {FileService} from "../../helpers/file/file.service";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {SystemSettings, SystemSettingsJSON} from "@common/system/settings/settings";
import {ZigbeeService} from "../../zigbee/zigbee.service";
import {DeviceMonitorService} from "../device-monitor/device-monitor.service";

const SAVE_FILE = "system/settings.json";

@Injectable()
export class SettingsService extends PersistentDataService<SettingsData, SettingsDataJSON> {
    
    constructor(
        fileService: FileService
    ) {
        super(fileService, SAVE_FILE, SettingsData);
        this.doAfterLoad((data) => {
            this.sendChanges(data.settings.toJSON());
        });
    }
    
    public async updateSettings(settingsUpdate: SystemSettingsJSON): Promise<SystemSettings> {
        const data = await this.data;
        data.settings.update(settingsUpdate);
        this.sendChanges(settingsUpdate);
        this.saveData();
        return data.settings;
    }
    
    public async getSettings(): Promise<SystemSettings> {
        const data = await this.data;
        return data.settings;
    }
    
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


class SettingsData {
    
    public settings: SystemSettings;
    
    constructor(settingsDataJSON?: SettingsDataJSON) {
        if (settingsDataJSON) {
            this.settings = SystemSettings.fromJSON(settingsDataJSON.settings);
        } else {
            this.settings = new SystemSettings();
        }
    }
    
    public toJSON(): SettingsDataJSON {
        return {
            settings: this.settings.toJSON()
        };
    }
}

interface SettingsDataJSON {
    settings: SystemSettingsJSON;
}
