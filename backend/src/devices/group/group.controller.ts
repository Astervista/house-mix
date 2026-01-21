import {BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query} from "@nestjs/common";
import {Group, GroupJSON} from "@common/devices/group/group";
import {GroupService} from "./group.service";
import {AddActuatorBody, type ChangeParentChange, DeleteGroupChildFate, type DeleteGroupOptions, type GroupCreateOptions, type GroupEditChanges} from "@common/devices/group/rest-classes";
import {EntityType} from "@common/devices/constants";

@Controller('group')
export class GroupController {
    
    constructor(private readonly groupService: GroupService) {}
    
    @Get("/")
    public async getAll(): Promise<GroupJSON[]> {
        const groups = await this.groupService.getAllGroups();
        return groups.map(dev => dev.toJSON());
    }
    
    @Post("/")
    public async create(
        @Body()
        data: GroupJSON,
        @Query()
        query: GroupCreateOptions
    ): Promise<void> {
        await this.groupService.createGroup(Group.fromJSON(data), query.parent ?? null);
    }
    
    @Get("/:name")
    public async getByName(@Param('name') name: string): Promise<GroupJSON> {
        const  group = await this.groupService.getGroupByName(name);
        if (group) {
            return group.toJSON();
        } else {
            throw new NotFoundException();
        }
    }
    
    @Post("/:name")
    public async createName(
        @Param('name')
        name: string,
        @Body()
        data: GroupJSON,
        @Query()
        query: GroupCreateOptions
    ): Promise<void> {
        if (data.name != name) {
            throw new BadRequestException();
        }
        await this.create(data, query);
    }
    
    @Patch("/:name")
    public async edit(
        @Param('name')
        name: string,
        @Body()
        data: GroupEditChanges
    ): Promise<void> {
        await this.groupService.editGroup(name, data);
    }
    
    @Delete("/:name")
    public async delete(
        @Param('name')
        name: string,
        @Body()
        options: DeleteGroupOptions | null
    ): Promise<void> {
        await this.groupService.deleteGroup(name, options ?? {fate: DeleteGroupChildFate.CURRENT_LEVEL});
    }
    
    @Patch("/:name/parent")
    public async changeParent(
        @Param('name')
        name: string,
        @Body()
        data: ChangeParentChange
    ): Promise<void> {
        await this.groupService.changeParent(name, data.parent, EntityType.GROUP);
    }
    
    @Post(":name/actuator/:actuatorName")
    @HttpCode(HttpStatus.OK)
    public async addActuator(
        @Param("name")
        name: string,
        @Param("actuatorName")
        actuatorName: string,
        @Body()
        options: AddActuatorBody | null
    ): Promise<void> {
        await this.groupService.addDevice(name, actuatorName, EntityType.ACTUATOR, options?.move ?? false);
    }

}
