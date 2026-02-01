import {Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query} from "@nestjs/common";
import {SensorService} from "./sensor.service";
import {Sensor, SensorJSON} from "@common/devices/sensor/sensor";
import { ApiOkResponse } from '@nestjs/swagger';
import {ChangeParentChange, GroupCreateOptions} from "@common/devices/group/rest-classes";
import {GroupService} from "../group/group.service";
import {EntityType} from "@common/devices/constants";
import {SensorEditChanges} from "@common/devices/sensor/rest-classes";
import {GetDevicesOptions, LockedExposes, UnavailableParents} from "@common/devices/rest-classes";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";
import MixService from "../../mixing/mix/mix.service";

@Controller('device/sensors')
export class SensorController {
    
    constructor(
        private readonly sensorService: SensorService,
        private readonly groupService: GroupService,
        private readonly mixService: MixService
    ) {}
    
    @Get("")
    @ApiOkResponse({ type: [Array<SensorJSON>] })
    public async getAll(
        @Query()
        query: GetDevicesOptions
    ): Promise<SensorJSON[]> {
        const sensors = await this.sensorService.getAllSensors(query);
        return sensors.map(dev => dev.toJSON());
    }
    
    @Post("")
    public async create(
        @Body()
        data: SensorJSON,
        @Query()
        query: GroupCreateOptions
    ): Promise<void> {
        await this.sensorService.createSensor(Sensor.fromJSON(data), query.parent ?? null);
    }
    
    @Get(":name")
    public async getByName(
        @Param('name')
        name: string
    ): Promise<SensorJSON> {
        const  sensor = await this.sensorService.getSensorByName(name);
        if (sensor) {
            return sensor.toJSON();
        } else {
            throw new NotFoundException();
        }
    }
    
    @Patch(":name")
    public async edit(
        @Param('name')
        name: string,
        @Body()
        edits: SensorEditChanges
    ): Promise<void> {
        await this.sensorService.editSensor(name, edits);
    }
    
    @Delete(":name")
    public async delete(
        @Param('name')
        name: string
    ): Promise<void> {
        await this.groupService.removeDevice(name, EntityType.SENSOR);
    }
    
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param('name')
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.deleteLocks(EntityType.SENSOR, name);
    }
    
    
    @Patch("/:name/parent")
    public async changeParent(
        @Param('name')
        name: string,
        @Body()
        data: ChangeParentChange
    ): Promise<void> {
        await this.groupService.changeParent(name, data.parent, EntityType.SENSOR);
    }
    
    @Get("/:name/unavailable-parents")
    public async getUnavailableParents(
        @Param('name')
        name: string
    ): Promise<UnavailableParents> {
        return this.groupService.getUnavailableParents(name, EntityType.SENSOR);
    }
    
    @Get("/:name/locked-exposes")
    public async getLockedExposes(
        @Param('name')
        name: string
    ): Promise<LockedExposes[]> {
        return await this.sensorService.getLockedExposes(name);
    }

}
