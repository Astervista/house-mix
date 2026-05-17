/**
 * This module contains the REST control logic for the <a href="../../rest/#tag-groups">`/groups`</a> api endpoint.
 *
 * @module
 */
// noinspection ES6UnusedImports
import type {ConflictException} from "@nestjs/common";
import {Body, Controller, Delete, Get, Param, Patch, Post, Query, NotFoundException, BadRequestException} from "@nestjs/common";
import {Group, GroupJSON} from "@common/devices/group/group";
import {GroupService} from "./group.service";
import {ChangeParentChange, DeleteGroupChildFate, DeleteGroupOptions, GetGroupsOptions, GroupCreateOptions, GroupEditChanges} from "@common/devices/group/rest-classes";
import {EntityType} from "@common/devices/constants";
import {UNIQUE_NAME_PATTERN} from "@common/utils/constants";
import {UnavailableParents} from "@common/devices/rest-classes";
import {MixService} from "../../mixing/mix/mix.service";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";
import {ApiOkResponse} from "@nestjs/swagger";

// noinspection ES6UnusedImports
import type {Mix} from "@common/mixing/mix/mix";

/**
 * This class is the controller for all the api endpoints under <a href="../../rest/#tag-groups">`/groups`</a>, regarding operations on {@link Group|`Group`s}.
 */
@Controller('groups')
export class GroupController {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {GroupService} groupService - The service handling {@link Group|`Group`} business logic. Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} and dependency operations. Instantiated by dependency injection.
     */
    constructor(
        private readonly groupService: GroupService,
        private readonly mixService: MixService
    ) {}
    
    /**
     * Get all {@link Group|`Group`s} in the system, optionally filtered by {@link Mix|`Mix`}.
     *
     * @param {GetGroupsOptions} query - The HTTP request's query parameters to filter the results.
     * @returns {Promise<GroupJSON[]>} An array containing the resulting {@link Group|`Group`s}' {@link GroupJSON|serializations}.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if one of {@link GetGroupsOptions#actuatorMix|`actuatorMix`} and
     *     {@link GetGroupsOptions#sensorMix|`sensorMix`} is specified at the same time as {@link GetGroupsOptions#anyMixed|`anyMixed`}.
     * @apiEndpoint <a href="../../rest/#operation-groups-get">`/groups`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/")
    @ApiOkResponse({type: [Array<GroupJSON>]})
    public async getAll(
        @Query()
        query: GetGroupsOptions
    ): Promise<GroupJSON[]> {
        const groups = await this.groupService.getAllGroups(query);
        return groups.map(dev => dev.toJSON());
    }
    
    /**
     * Creates a new {@link Group|`Group`} in the system.
     *
     * @param {GroupJSON} data - The HTTP request's body containing all the information about the {@link Group|`Group`} to be created.
     * @param {GroupCreateOptions} query - The HTTP request's query parameters with additional optional info for the creation, namely the name of the {@link Group|`Group`} where the
     *                                     new group will be placed.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if there already exist a {@link Group|group} with the same {@link Group#name|name}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if a {@link GroupCreateOptions#parent|parent} was specified but no {@link Group|`Group`} was found with
     *     the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-post">`/groups`</a>.
     * @group API Endpoints
     * @post
     */
    @Post("/")
    public async create(
        @Body()
        data: GroupJSON,
        @Query()
        query: GroupCreateOptions
    ): Promise<void> {
        await this.groupService.createGroup(Group.fromJSON(data), query.parent ?? null);
    }
    
    /**
     * Get a {@link Group|`Group`} with a specific {@link Group#name|`name`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Group#name|`name`} of the group to retrieve.
     * @returns {Promise<GroupJSON>} - The {@link Group|`Group`}'s {@link GroupJSON|serialization}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Group|`Group`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-name-get">`/groups/{name}`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/:name")
    public async getByName(@Param('name') name: string): Promise<GroupJSON> {
        const  group = await this.groupService.getGroupByName(name);
        if (group) {
            return group.toJSON();
        } else {
            throw new NotFoundException();
        }
    }
    
    /**
     * Creates a new {@link Group|`Group`} in the system, using the name specified in the path.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Group#name|`name`} of the group to create.
     * @param {GroupJSON} data - The HTTP request's body containing all the information about the {@link Group|`Group`} to be created.
     * @param {GroupCreateOptions} query - The HTTP request's query parameters with additional optional info for the creation, namely the name of the {@link Group|`Group`} where the
     *                                     new group will be placed.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the name in the path does not match the name in the body.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if there already exist a {@link Group|group} with the same {@link Group#name|name}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if a {@link GroupCreateOptions#parent|parent} was specified but no {@link Group|`Group`} was found with
     *     the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-name-post">`/groups/{name}`</a>.
     * @group API Endpoints
     * @post
     */
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
    
    /**
     * Edit a {@link Group|`Group`}'s properties, given its {@link Group#name|`name`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Group#name|`name`} of the group to edit.
     * @param {GroupEditChanges} data - The HTTP request's body containing the {@link GroupEditChanges|properties} to be updated.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Group|`Group`} was found with the specified name.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a new {@link Group#name|`name`} was specified, but a {@link Group|group} with that name already exists.
     * @returns {Promise<void>}
     * @apiEndpoint <a href="../../rest/#operation-groups-name-patch">`/groups/{name}`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch("/:name")
    public async edit(
        @Param('name')
        name: string,
        @Body()
        data: GroupEditChanges
    ): Promise<void> {
        await this.groupService.editGroup(name, data);
    }
    
    /**
     * Removes a {@link Group|`Group`} from the system by its name, if possible.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Group#name|`name`} of the {@link Group|group} to remove.
     * @param {DeleteGroupOptions} options - The HTTP request's body containing options for handling children of the deleted group.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Group|`Group`} was found with the specified name.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the {@link Group|`Group`} cannot be deleted because it is linked to a {@link Mix|mix} that is
     *     referenced by another {@link Mix|mix}.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the provided options are invalid.
     * @returns {Promise<void>}
     * @apiEndpoint <a href="../../rest/#operation-groups-name-delete">`/groups/{name}`</a>.
     * @group API Endpoints
     * @delete
     */
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
    
    /**
     * Gets all the conflicts that prevent a {@link Group|`Group`} from being deleted.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Group#name|`name`} of the {@link Group|group} to check.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link Group|`Group`} and prevent it from being deleted. If empty, it means that
     *                                       the {@link Group|`Group`} can be deleted.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Group|`Group`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-name-delete-locks-get">`/groups/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param('name')
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.getDeleteLocks(EntityType.GROUP, name);
    }
    
    /**
     * Move a {@link Group|`Group`} inside a different {@link Group|`Group`}, or take it out of any {@link Group|`Group`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Group#name|`name`} of the {@link Group|`Group`} to move.
     * @param {ChangeParentChange} data - The HTTP request's body containing the property {@link ChangeParentChange#parent|`parent`} indicating the {@link Group#name|name} of the new
     *                                    {@link Group|parent} or `null` to remove the parent.
     * @returns {Promise<void>}
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Group|`Group`} or destination {@link Group|`Group`} was found with the specified
     *                               names.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the {@link Group|`Group`} cannot be moved to the requested {@link Group|`Group`}, because it would
     *     break dependencies inside the {@link Mix|mixes}.
     * @apiEndpoint <a href="../../rest/#operation-groups-name-parent-patch">`/groups/{name}/parent`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch("/:name/parent")
    public async changeParent(
        @Param('name')
        name: string,
        @Body()
        data: ChangeParentChange
    ): Promise<void> {
        await this.groupService.changeParent(name, data.parent, EntityType.GROUP);
    }
    
    /**
     * Returns information about all the {@link Group|`Group`s} that cannot be parents for this {@link Group|`Group`}, because they would break
     * dependencies inside the {@link Mix|mixes}. For example, if a {@link Group|group}'s {@link Mix|`Mix`} is referenced by a parent {@link Group|group}'s
     * {@link Mix|`Mix`}, this parent must remain in the hierarchy, otherwise the {@link Group|group}'s {@link Mix|mix} will not be able to reach it.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Group#name|`name`} of the {@link Group|`Group`}.
     * @returns {Promise<UnavailableParents>} The information about the {@link UnavailableParents|unavailable groups}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Group|`Group`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-name-unavailable-parents-get">`/groups/{name}/unavailable-parents`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/:name/unavailable-parents")
    public async getUnavailableParents(
        @Param('name')
        name: string
    ): Promise<UnavailableParents> {
        return this.groupService.getUnavailableParents(name, EntityType.GROUP);
    }

}

/**
 * Validates that the provided object is a valid {@link DeleteGroupOptions|`DeleteGroupOptions`} object,
 * and throws a {@link BadRequestException|`BadRequestException`} if not.
 *
 * @param {unknown} obj - The object to validate.
 * @returns {asserts obj is DeleteGroupOptions} If the function returns without throwing an exception, the provided object is guaranteed
 *                                              to be a valid {@link DeleteGroupOptions|`DeleteGroupOptions`} object.
 * @throws {BadRequestException} {@link BadRequestException|`BadRequestException`} if the provided object is not a valid {@link DeleteGroupOptions|`DeleteGroupOptions`} object.
 */
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
