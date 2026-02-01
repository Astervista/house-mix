import {BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query} from "@nestjs/common";
import {Group, GroupJSON} from "@common/devices/group/group";
import {GroupService} from "./group.service";
import {ChangeParentChange, DeleteGroupChildFate, DeleteGroupOptions, GetGroupsOptions, GroupCreateOptions, GroupEditChanges} from "@common/devices/group/rest-classes";
import {EntityType} from "@common/devices/constants";
import {UNIQUE_NAME_PATTERN} from "@common/utils/constants";
import {UnavailableParents} from "@common/devices/rest-classes";
import MixService from "../../mixing/mix/mix.service";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";

@Controller('groups')
export class GroupController {
    
    constructor(
        private readonly groupService: GroupService,
        private readonly mixService: MixService
    ) {}
    
    @Get("/")
    public async getAll(
        @Query()
        query: GetGroupsOptions
    ): Promise<GroupJSON[]> {
        const groups = await this.groupService.getAllGroups(query);
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
        options: unknown
    ): Promise<void> {
        let cleanOptions: DeleteGroupOptions;
        if (options != null) {
            validateDeleteGroupOptions(options);
            if (options.fate == DeleteGroupChildFate.CHOOSE_WHERE) {
                cleanOptions = {fate: DeleteGroupChildFate.CHOOSE_WHERE, parent: options.parent};
            } else {
                cleanOptions = {fate: options.fate};
            }
        } else {
            cleanOptions = {fate: DeleteGroupChildFate.CURRENT_LEVEL};
        }
        await this.groupService.deleteGroup(name, cleanOptions);
    }
    
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param('name')
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.deleteLocks(EntityType.GROUP, name);
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
    
    @Get("/:name/unavailable-parents")
    public async getUnavailableParents(
        @Param('name')
        name: string
    ): Promise<UnavailableParents> {
        return this.groupService.getUnavailableParents(name, EntityType.GROUP);
    }

}

function validateDeleteGroupOptions(obj: unknown): asserts obj is DeleteGroupOptions {
    if (typeof obj !== 'object' || obj === null) {
        throw new BadRequestException("Body must be an object");
    }
    
    const o = obj as Record<string, unknown>;
    
    if (o["fate"] === DeleteGroupChildFate.CHOOSE_WHERE) {
        if (typeof o["parent"] !== 'string') {
            throw new BadRequestException("Moving the orphans to a specific group requires a parent to be specified");
        }
        if (!UNIQUE_NAME_PATTERN.test(o["parent"])) {
            throw new BadRequestException("The new parent name is not a valid unique identifier");
        }
        return;
    } else if (
        o["fate"] === DeleteGroupChildFate.CURRENT_LEVEL ||
        o["fate"] === DeleteGroupChildFate.ROOT_LEVEL
    ) {
        if (o["parent"] !== undefined) {
            if (o["fate"] === DeleteGroupChildFate.CURRENT_LEVEL) {
                throw new BadRequestException("Moving the orphans to the current level cannot have a new parent set, because it's determined by the current level");
            } else {
                throw new BadRequestException("When moving the orphans to root, parent cannot be set, since the root is not a group");
            }
        }
        return;
    } else if (
        o["fate"] !== null
    ) {
        throw new BadRequestException("Invalid fate");
    }
}

