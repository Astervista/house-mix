import {Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query} from "@nestjs/common";
import {ActuatorService} from "./actuator.service";
import {Actuator, ActuatorJSON} from "@common/devices/actuator/actuator";
import { ApiOkResponse } from '@nestjs/swagger';
import type {ChangeParentChange, GroupCreateOptions} from "@common/devices/group/rest-classes";
import {GroupService} from "../group/group.service";
import {EntityType} from "@common/devices/constants";
import {type ActuatorEditChanges} from "@common/devices/actuator/rest-classes";

@Controller('device/actuators')
export class ActuatorController {
    
    constructor(
        private readonly actuatorService: ActuatorService,
        private readonly groupService: GroupService
    ) {}
    
    @Get("")
    @ApiOkResponse({ type: [Array<ActuatorJSON>] })
    public async getAll(): Promise<ActuatorJSON[]> {
        const actuators = await this.actuatorService.getAllActuators();
        return actuators.map(dev => dev.toJSON());
    }
    
    @Post("")
    public async create(
        @Body()
        data: ActuatorJSON,
        @Query()
        query: GroupCreateOptions
    ): Promise<void> {
        await this.actuatorService.createActuator(Actuator.fromJSON(data), query.parent ?? null);
    }
    
    @Get(":name")
    public async getByName(
        @Param('name')
        name: string
    ): Promise<ActuatorJSON> {
        const  actuator = await this.actuatorService.getActuatorByName(name);
        if (actuator) {
            return actuator.toJSON();
        } else {
            throw new NotFoundException();
        }
    }
    
    @Patch(":name")
    public async edit(
        @Param('name')
        name: string,
        @Body()
        edits: ActuatorEditChanges
    ): Promise<void> {
        await this.actuatorService.editActuator(name, edits);
    }
    
    @Delete(":name")
    public async delete(
        @Param('name')
        name: string
    ): Promise<void> {
        await this.groupService.removeDevice(name, EntityType.ACTUATOR);
    }
    
    @Patch("/:name/parent")
    public async changeParent(
        @Param('name')
        name: string,
        @Body()
        data: ChangeParentChange
    ): Promise<void> {
        await this.groupService.changeParent(name, data.parent, EntityType.ACTUATOR);
    }

}
