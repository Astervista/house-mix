import {Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query} from "@nestjs/common";
import {ActuatorService} from "./actuator.service";
import {Actuator, ActuatorJSON} from "@common/devices/actuator/actuator";
import { ApiOkResponse } from '@nestjs/swagger';
import {ChangeParentChange, GroupCreateOptions} from "@common/devices/group/rest-classes";
import {GroupService} from "../group/group.service";
import {EntityType} from "@common/devices/constants";
import {ActuatorEditChanges} from "@common/devices/actuator/rest-classes";
import {GetDevicesOptions, UnavailableParents} from "@common/devices/rest-classes";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";
import MixService from "../../mixing/mix/mix.service";

@Controller('device/actuators')
export class ActuatorController {
    
    constructor(
        private readonly actuatorService: ActuatorService,
        private readonly groupService: GroupService,
        private readonly mixService: MixService
    ) {}
    
    @Get("")
    @ApiOkResponse({ type: [Array<ActuatorJSON>] })
    public async getAll(
        @Query()
        query: GetDevicesOptions
    ): Promise<ActuatorJSON[]> {
        const actuators = await this.actuatorService.getAllActuators(query);
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
    
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param('name')
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.getDeleteLocks(EntityType.ACTUATOR, name);
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
    
    @Get("/:name/unavailable-parents")
    public async getUnavailableParents(
        @Param('name')
        name: string
    ): Promise<UnavailableParents> {
        return this.groupService.getUnavailableParents(name, EntityType.ACTUATOR);
    }

}
