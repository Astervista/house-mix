import {BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post} from "@nestjs/common";
import MixService from "../../mixing/mix/mix.service";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";
import {SystemOrigin} from "@common/system/constants";
import {DeviceMonitorService} from "./device-monitor.service";
import {DeviceMonitorDevice, DeviceMonitorDeviceJSON} from "@common/system/device-monitor/device-monitor-device";

@Controller("system/device-monitor")
export class DeviceMonitorController {
    
    
    constructor(
        private readonly deviceMonitorService: DeviceMonitorService,
        private readonly mixService: MixService
    ) {
    
    }
    
    @Get("")
    public async getAll(): Promise<DeviceMonitorDeviceJSON[]> {
        const devices = await this.deviceMonitorService.getAllDevices();
        return devices.map(device => device.toJSON());
    }
    
    
    @Post("")
    public async add(
        @Body()
        data: DeviceMonitorDeviceJSON
    ): Promise<void> {
        await this.deviceMonitorService.addDevice(DeviceMonitorDevice.fromJSON(data));
    }
    
    @Delete("/:name")
    public async delete(
        @Param("name")
        name: string
    ): Promise<void> {
        await this.deviceMonitorService.deleteDevice(name);
    }
    
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
    
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param("name")
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.getDeleteLocks(SystemOrigin.DEVICE_STATUS, name);
    }
    
}
