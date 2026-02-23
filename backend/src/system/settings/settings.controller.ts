import {Body, Controller, Get, Patch} from "@nestjs/common";
import {SettingsService} from "./settings.service";
import {SystemSettingsJSON} from "@common/system/settings/settings";

@Controller("system/settings")
export class SettingsController {
    
    constructor(
        private readonly settingsService: SettingsService
    ) {}
    
    @Get("/")
    public async getSettings(): Promise<SystemSettingsJSON> {
        const settings = await this.settingsService.getSettings();
        return settings.toJSON();
    }
    
    @Patch("/")
    public async updateSettings(@Body() update: SystemSettingsJSON): Promise<SystemSettingsJSON> {
        return (await this.settingsService.updateSettings(update)).toJSON();
    }
    
}
