/**
 * This module contains the REST control logic for the <a href="../../rest/#tag-settings">`/system/settings`</a> api endpoint.
 *
 * @module
 */
import {Body, Controller, Get, Patch} from "@nestjs/common";
import {SettingsService} from "./settings.service";
import {SystemSettingsJSON} from "@common/system/settings/settings";

// noinspection ES6UnusedImports
import type {SystemSettings} from '@common/system/settings/settings';

/**
 * This class is the controller for all the api endpoints under <a href="../../rest/#tag-settings">`/system/settings`</a>,
 * regarding operations on {@link SystemSettings|`SystemSettings`}.
 */
@Controller("system/settings")
export class SettingsController {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {SettingsService} settingsService - The service handling {@link SystemSettings|`SystemSettings`} business logic.
     *                                            Instantiated by dependency injection.
     */
    constructor(
        private readonly settingsService: SettingsService
    ) {}
    
    /**
     * Get the current {@link SystemSettings|`SystemSettings`} of the system.
     *
     * @returns {Promise<SystemSettingsJSON>} The resulting {@link SystemSettings|`SystemSettings`}' {@link SystemSettingsJSON|serialization}.
     * @apiEndpoint <a href="../../rest/#operation-system-settings-get">`/system/settings`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/")
    public async getSettings(): Promise<SystemSettingsJSON> {
        const settings = await this.settingsService.getSettings();
        return settings.toJSON();
    }
    
    /**
     * Updates the {@link SystemSettings|`SystemSettings`} of the system.
     *
     * @param {SystemSettingsJSON} update - The HTTP request's body containing the {@link SystemSettingsJSON|serialization} of the settings to update.
     * @returns {Promise<SystemSettingsJSON>} The updated {@link SystemSettings|`SystemSettings`}' {@link SystemSettingsJSON|serialization}.
     * @apiEndpoint <a href="../../rest/#operation-system-settings-patch">`/system/settings`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch("/")
    public async updateSettings(@Body() update: SystemSettingsJSON): Promise<SystemSettingsJSON> {
        return (await this.settingsService.updateSettings(update)).toJSON();
    }
    
}
