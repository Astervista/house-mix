import {Injectable} from "@nestjs/common";
import {FileService} from "../../helpers/file/file.service";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {SystemSettings, SystemSettingsJSON} from "@common/system/settings/settings";

const SAVE_FILE = "system/settings.json";

@Injectable()
export class SettingsService extends PersistentDataService<SettingsData, SettingsDataJSON> {
    
    constructor(
        fileService: FileService
    ) {
        super(fileService, SAVE_FILE, SettingsData);
    }
    
    public async updateSettings(settingsUpdate: SystemSettingsJSON): Promise<SystemSettings> {
        const data = await this.data;
        data.settings.update(settingsUpdate);
        this.saveData();
        return data.settings;
    }
    
    public async getSettings(): Promise<SystemSettings> {
        const data = await this.data;
        return data.settings;
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
