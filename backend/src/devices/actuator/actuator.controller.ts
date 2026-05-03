/**
 * This module contains the REST control logic for the <a href="../../rest/#tag-actuators">`/device/actuators`</a> api endpoint.
 *
 * @module
 */
// noinspection ES6UnusedImports
import type { BadRequestException, ConflictException } from '@nestjs/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, NotFoundException } from '@nestjs/common';
import { ActuatorService } from './actuator.service';
import { Actuator, ActuatorJSON } from '@common/devices/actuator/actuator';
import { ApiOkResponse } from '@nestjs/swagger';
import { ChangeParentChange, GroupCreateOptions } from '@common/devices/group/rest-classes';
import { GroupService } from '../group/group.service';
import { EntityType } from '@common/devices/constants';
import { ActuatorEditChanges } from '@common/devices/actuator/rest-classes';
import { GetDevicesOptions, UnavailableParents } from '@common/devices/rest-classes';
import { MixPositionInfo } from '@common/mixing/mix/rest-classes';
import {MixService} from '../../mixing/mix/mix.service';
// noinspection ES6UnusedImports
import type { Mix } from '@common/mixing/mix/mix';
// noinspection ES6UnusedImports
import type { Group } from '@common/devices/group/group';

/**
 * This class is the controller for all the api endpoints under <a href="../../rest/#tag-actuators">`/device/actuators`</a>, regarding operations on {@link Actuator|`Actuator`s}.
 */
@Controller("device/actuators")
export class ActuatorController {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {ActuatorService} actuatorService - The service handling {@link Actuator|`Actuator`} business logic. Instantiated by dependency injection.
     * @param {GroupService} groupService - The service handling {@link Group|`Group`} and hierarchy operations. Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} and dependency operations. Instantiated by dependency injection.
     */
    constructor(
        private readonly actuatorService: ActuatorService,
        private readonly groupService: GroupService,
        private readonly mixService: MixService
    ) {}
    
    /**
     * Get all {@link Actuator|`Actuator`s} in the system, optionally filtered by {@link Mix|`Mix`}.
     *
     * @param {GetDevicesOptions} query - The HTTP request's query parameters to filter the results.
     * @returns {Promise<ActuatorJSON[]>} An array containing the resulting {@link Actuator|`Actuator`s}' {@link ActuatorJSON|serializations}.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if both {@link GetDevicesOptions#mix|`mix`} and {@link GetDevicesOptions#anyMixed|`anyMixed`} are
     *     specified at the same time.
     * @see REST API endpoint <a href="../../rest/#operation-device-actuators-get">`GET /device/actuators`</a>.
     * @group API Endpoints
     */
    @Get("")
    @ApiOkResponse({type: [Array<ActuatorJSON>]})
    public async getAll(
        @Query()
        query: GetDevicesOptions
    ): Promise<ActuatorJSON[]> {
        const actuators = await this.actuatorService.getAllActuators(query);
        return actuators.map(dev => dev.toJSON());
    }
    
    /**
     * Creates a new device of type {@link Actuator|`Actuator`} in the system.
     *
     * @param {ActuatorJSON} data - The HTTP request's body containing all the information about the {@link Actuator|`Actuator`} to be created.
     * @param {GroupCreateOptions} query - The HTTP request's query parameters with additional optional info for the creation, namely the name of the {@link Group|`Group`} where the
     *                                     actuator will be placed.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if there already exist an {@link Actuator|actuator} with the same {@link Actuator#name|name}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if a {@link GroupCreateOptions#parent|parent} was specified but no {@link Group|`Group`} was found with
     *     the specified name.
     * @see REST API endpoint <a href="../../rest/#operation-device-actuators-post">`POST /device/actuators`</a>.
     * @group API Endpoints
     */
    @Post("")
    public async create(
        @Body()
        data: ActuatorJSON,
        @Query()
        query: GroupCreateOptions
    ): Promise<void> {
        await this.actuatorService.createActuator(Actuator.fromJSON(data), query.parent ?? null);
    }
    
    /**
     * Get an {@link Actuator|`Actuator`} with a specific {@link Actuator#name|`name`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Actuator#name|`name`} of the actuator to retrieve.
     * @returns {Promise<ActuatorJSON>} - The {@link Actuator|`Actuator`}'s {@link ActuatorJSON|serialization}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Actuator|`Actuator`} was found with the specified name.
     * @see REST API endpoint <a href="../../rest/#operation-device-actuators-name-get">`GET /device/actuators/{name}`</a>.
     * @group API Endpoints
     */
    @Get(":name")
    public async getByName(
        @Param("name")
        name: string
    ): Promise<ActuatorJSON> {
        const actuator = await this.actuatorService.getActuatorByName(name);
        if (actuator) {
            return actuator.toJSON();
        } else {
            throw new NotFoundException();
        }
    }
    
    /**
     * Edit an {@link Actuator|`Actuator`}'s properties, given its {@link Actuator#name|`name`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Actuator#name|`name`} of the actuator to edit.
     * @param {ActuatorEditChanges} edits - The HTTP request's body containing the {@link ActuatorEditChanges|properties} to be updated.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Actuator|`Actuator`} was found with the specified name.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a new {@link Actuator#name|`name`} was specified, but an {@link Actuator|actuator} with that name
     *     already exists.
     * @returns {Promise<void>}
     * @see REST API endpoint <a href="../../rest/#operation-device-actuators-name-patch">`PATCH /device/actuators/{name}`</a>.
     * @group API Endpoints
     */
    @Patch(":name")
    public async edit(
        @Param("name")
        name: string,
        @Body()
        edits: ActuatorEditChanges
    ): Promise<void> {
        await this.actuatorService.editActuator(name, edits);
    }
    
    /**
     * Removes an {@link Actuator|`Actuator`} from the system by its name, if possible.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Actuator#name|`name`} of the {@link Actuator|actuator} to remove.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Actuator|`Actuator`} was found with the specified name.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the {@link Actuator|`Actuator`} cannot be deleted because it is linked to a {@link Mix|mix} that is
     *     referenced in a {@link Mix|mix} downstream.
     * @returns {Promise<void>}
     * @see REST API endpoint <a href="../../rest/#operation-device-actuators-name-delete">`DELETE /device/actuators/{name}`</a>.
     * @group API Endpoints
     */
    @Delete(":name")
    public async delete(
        @Param("name")
        name: string
    ): Promise<void> {
        await this.groupService.removeDevice(name, EntityType.ACTUATOR);
    }
    
    /**
     * Gets all the conflicts that prevent an {@link Actuator|`Actuator`} from being deleted.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Actuator#name|`name`} of the {@link Actuator|actuator} to check.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link Actuator|`Actuator`} and prevent it from being deleted. If empty, it means that
     *                                       the {@link Actuator|`Actuator`} can be deleted.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Actuator|`Actuator`} was found with the specified name.
     * @see REST API endpoint <a href="../../rest/#operation-device-actuators-name-delete-locks-get">`GET /device/actuators/{name}/delete-locks`</a>.
     * @group API Endpoints
     */
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param("name")
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.getDeleteLocks(EntityType.ACTUATOR, name);
    }
    
    /**
     * Move an {@link Actuator|`Actuator`} inside a different {@link Group|`Group`}, or take it out of any {@link Group|`Group`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Actuator#name|`name`} of the {@link Actuator|`Actuator`} to move.
     * @param {ChangeParentChange} data - The HTTP request's body containing the property {@link ChangeParentChange#parent|`parent`} indicating the {@link Group#name|name} of the new
     *                                    {@link Group|parent} or `null` to remove the parent.
     * @returns {Promise<void>}
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Actuator|`Actuator`} or destination {@link Group|`Group`} was found with the specified
     *                               names.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the {@link Actuator|`Actuator`} cannot be moved to the requested {@link Group|`Group`}, because it
     *     would break dependencies inside the {@link Mix|mixes}.
     * @see REST API endpoint <a href="../../rest/#operation-device-actuators-name-parent-patch">`PATCH /device/actuators/{name}/parent`</a>.
     * @group API Endpoints
     */
    @Patch("/:name/parent")
    public async changeParent(
        @Param("name")
        name: string,
        @Body()
        data: ChangeParentChange
    ): Promise<void> {
        await this.groupService.changeParent(name, data.parent, EntityType.ACTUATOR);
    }
    
    /**
     * Returns information about all the {@link Group|`Group`s} that cannot be parents for this {@link Actuator|`Actuator`}, because they would break
     * dependencies inside the {@link Mix|mixes}. For example, if an {@link Actuator|actuator}'s {@link Mix|`Mix`} references a parent {@link Group|group}'s
     * {@link Mix|`Mix`}, this parent must remain in the hierarchy, otherwise the {@link Actuator|`Actuator`}'s {@link Mix|mix} will not be able to reach it.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Actuator#name|`name`} of the {@link Actuator|`Actuator`}.
     * @returns {Promise<UnavailableParents>} The information about the {@link UnavailableParents|unavailable groups}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Actuator|`Actuator`} was found with the specified name.
     * @see REST API endpoint <a href="../../rest/#operation-device-actuators-name-unavailable-parents-get">`GET /device/actuators/{name}/unavailable-parents`</a>.
     * @group API Endpoints
     */
    @Get("/:name/unavailable-parents")
    public async getUnavailableParents(
        @Param("name")
        name: string
    ): Promise<UnavailableParents> {
        return this.groupService.getUnavailableParents(name, EntityType.ACTUATOR);
    }
    
}
