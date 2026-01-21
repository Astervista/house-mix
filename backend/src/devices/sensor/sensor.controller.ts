import {Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query} from "@nestjs/common";
import {SensorService} from "./sensor.service";
import {Sensor, SensorJSON} from "@common/devices/sensor/sensor";
import { ApiOkResponse } from '@nestjs/swagger';
import type {ChangeParentChange, GroupCreateOptions} from "@common/devices/group/rest-classes";
import {GroupService} from "../group/group.service";
import {EntityType} from "@common/devices/constants";
import {type SensorEditChanges} from "@common/devices/sensor/rest-classes";

@Controller('device/sensor')
export class SensorController {
    
    constructor(
        private readonly sensorService: SensorService,
        private readonly groupService: GroupService
    ) {}
    
    @Get("")
    @ApiOkResponse({ type: [Array<SensorJSON>] })
    public async getAll(): Promise<SensorJSON[]> {
        const sensors = await this.sensorService.getAllSensors();
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
    
    @Patch("/:name/parent")
    public async changeParent(
        @Param('name')
        name: string,
        @Body()
        data: ChangeParentChange
    ): Promise<void> {
        await this.groupService.changeParent(name, data.parent, EntityType.SENSOR);
    }

}
