/**
 * This module contains the REST control logic for the <a href="../../rest/#tag-device-monitor">`/system/device-monitor`</a> api endpoint.
 *
 * @module
 */
// noinspection ES6UnusedImports
import type {ConflictException, NotFoundException } from "@nestjs/common";
import {BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post} from "@nestjs/common";
import {MixService} from "../../mixing/mix/mix.service";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";
import {SystemOrigin} from "@common/system/constants";
import {DeviceMonitorService} from "./device-monitor.service";
import {DeviceMonitorDevice, DeviceMonitorDeviceJSON} from "@common/system/device-monitor/device-monitor-device";

// noinspection ES6UnusedImports
import type {Mix} from "@common/mixing/mix/mix";

/**
 * This class is the controller for all the api endpoints under <a href="../../rest/#tag-device-monitor">`/system/device-monitor`</a>,
 * regarding operations on {@link DeviceMonitorDevice|`DeviceMonitorDevice`s}.
 */
@Controller("system/device-monitor")
export class DeviceMonitorController {
    
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {DeviceMonitorService} deviceMonitorService - The service handling {@link DeviceMonitorDevice|`DeviceMonitorDevice`} business logic.
     *                                                      Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling mixing and delete locks logic.
     *                                  Instantiated by dependency injection.
     */
    constructor(
        private readonly deviceMonitorService: DeviceMonitorService,
        private readonly mixService: MixService
    ) {
    
    }
    
    /**
     * Get all {@link DeviceMonitorDevice|`DeviceMonitorDevice`s} in the system.
     *
     * @returns {Promise<DeviceMonitorDeviceJSON[]>} An array containing the resulting {@link DeviceMonitorDevice|`DeviceMonitorDevice`s}' {@link DeviceMonitorDeviceJSON|serializations}.
     * @see REST API endpoint <a href="../../rest/#operation-system-device-monitor-get">`GET /system/device-monitor`</a>.
     * @group API Endpoints
     */
    @Get("")
    public async getAll(): Promise<DeviceMonitorDeviceJSON[]> {
        const devices = await this.deviceMonitorService.getAllDevices();
        return devices.map(device => device.toJSON());
    }
    
    
    /**
     * Adds a new {@link DeviceMonitorDevice|`DeviceMonitorDevice`} to the system.
     *
     * @param {DeviceMonitorDeviceJSON} data - The HTTP request's body containing the {@link DeviceMonitorDeviceJSON|serialization} of the device to add.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a device with the same name already exists.
     * @see REST API endpoint <a href="../../rest/#operation-system-device-monitor-post">`POST /system/device-monitor`</a>.
     * @group API Endpoints
     */
    @Post("")
    public async add(
        @Body()
        data: DeviceMonitorDeviceJSON
    ): Promise<void> {
        await this.deviceMonitorService.addDevice(DeviceMonitorDevice.fromJSON(data));
    }
    
    /**
     * Removes a {@link DeviceMonitorDevice|`DeviceMonitorDevice`} from the system by its name.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link DeviceMonitorDevice#name|`name`} of the device to remove.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the device is used in a mix.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link DeviceMonitorDevice|`DeviceMonitorDevice`} was found with the specific name.
     * @see REST API endpoint <a href="../../rest/#operation-system-device-monitor-name-delete">`DELETE /system/device-monitor/{name}`</a>.
     * @group API Endpoints
     */
    @Delete("/:name")
    public async delete(
        @Param("name")
        name: string
    ): Promise<void> {
        await this.deviceMonitorService.deleteDevice(name);
    }
    
    /**
     * Edit a {@link DeviceMonitorDevice|`DeviceMonitorDevice`}'s properties, given its {@link DeviceMonitorDevice#name|`name`}.
     * This call cannot change the name of the device, to achieve this delete and recreate the device.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link DeviceMonitorDevice#name|`name`} of the device to edit.
     * @param {DeviceMonitorDeviceJSON} data - The HTTP request's body containing the properties to be updated.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if there is an attempt to change the {@link DeviceMonitorDevice#name|`name`}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link DeviceMonitorDevice|`DeviceMonitorDevice`} was found with the specific name.
     * @see REST API endpoint <a href="../../rest/#operation-system-device-monitor-name-patch">`PATCH /system/device-monitor/{name}`</a>.
     * @group API Endpoints
     */
    @Patch("/:name")
    public async edit(
        @Param("name")
        name: string,
        @Body()
        data: DeviceMonitorDeviceJSON
    ): Promise<void> {
        const device = DeviceMonitorDevice.fromJSON(data);
        if (device.name != name) {
            throw new BadRequestException("Cannot change the name of the device with this call");
        }
        await this.deviceMonitorService.editDevice(device);
    }
    
    /**
     * Gets all the conflicts that prevent a {@link DeviceMonitorDevice|`DeviceMonitorDevice`} from being deleted.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link DeviceMonitorDevice#name|`name`} of the {@link DeviceMonitorDevice|device} to check.
     * @returns {Promise<MixPositionInfo[]>}  A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link DeviceMonitorDevice|`DeviceMonitorDevice`} and prevent it from being deleted. If empty,
     *                                       it means that the {@link DeviceMonitorDevice|`DeviceMonitorDevice`} can be deleted.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link DeviceMonitorDevice|`DeviceMonitorDevice`} was found with the specific name.
     * @see REST API endpoint <a href="../../rest/#operation-system-device-monitor-name-delete-locks-get">`GET /system/device-monitor/{name}/delete-locks`</a>.
     * @group API Endpoints
     */
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param("name")
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.getDeleteLocks(SystemOrigin.DEVICE_STATUS, name);
    }
    
}
