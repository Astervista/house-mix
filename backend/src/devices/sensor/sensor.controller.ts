/**
 * This module contains the REST control logic for the <a href="../../rest/#tag-sensors">`/device/sensors`</a> api endpoint.
 *
 * @module
 */
// noinspection ES6UnusedImports
import type {BadRequestException, ConflictException } from "@nestjs/common";
import {Body, Controller, Delete, Get, Param, Patch, Post, Query,NotFoundException} from "@nestjs/common";
import {SensorService} from "./sensor.service";
import {Sensor, SensorJSON} from "@common/devices/sensor/sensor";
import {ApiOkResponse} from "@nestjs/swagger";
import {ChangeParentChange, GroupCreateOptions} from "@common/devices/group/rest-classes";
import {GroupService} from "../group/group.service";
import {EntityType} from "@common/devices/constants";
import {SensorEditChanges} from "@common/devices/sensor/rest-classes";
import {GetDevicesOptions, LockedExposes, UnavailableParents} from "@common/devices/rest-classes";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";
import {MixService} from "../../mixing/mix/mix.service";

// noinspection ES6UnusedImports
import type {Mix} from "@common/mixing/mix/mix";
// noinspection ES6UnusedImports
import type {Group} from "@common/devices/group/group";

/**
 * This class is the controller for all the api endpoints under <a href="../../rest/#tag-sensors">`/device/sensors`</a>, regarding operations on {@link Sensor|`Sensor`s}.
 */
@Controller('device/sensors')
export class SensorController {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {SensorService} sensorService - The service handling {@link Sensor|`Sensor`} business logic. Instantiated by dependency injection.
     * @param {GroupService} groupService - The service handling {@link Group|`Group`} and hierarchy operations. Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} and dependency operations. Instantiated by dependency injection.
     */
    constructor(
        private readonly sensorService: SensorService,
        private readonly groupService: GroupService,
        private readonly mixService: MixService
    ) {}
    
    /**
     * Get all {@link Sensor|`Sensor`s} in the system, optionally filtered by {@link Mix|`Mix`}.
     *
     * @param {GetDevicesOptions} query - The HTTP request's query parameters to filter the results.
     * @returns {Promise<SensorJSON[]>} An array containing the resulting {@link Sensor|`Sensor`s}' {@link SensorJSON|serializations}.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if both {@link GetDevicesOptions#mix|`mix`} and {@link GetDevicesOptions#anyMixed|`anyMixed`} are
     *     specified at the same time.
     * @see REST API endpoint <a href="../../rest/#operation-device-sensors-get">`GET /device/sensors`</a>.
     * @group API Endpoints
     */
    @Get("")
    @ApiOkResponse({ type: [Array<SensorJSON>] })
    public async getAll(
        @Query()
        query: GetDevicesOptions
    ): Promise<SensorJSON[]> {
        const sensors = await this.sensorService.getAllSensors(query);
        return sensors.map(dev => dev.toJSON());
    }
    
    /**
     * Creates a new device of type {@link Sensor|`Sensor`} in the system.
     *
     * @param {SensorJSON} data - The HTTP request's body containing all the information about the {@link Sensor|`Sensor`} to be created.
     * @param {GroupCreateOptions} query - The HTTP request's query parameters with additional optional info for the creation, namely the name of the {@link Group|`Group`} where the
     *                                     sensor will be placed.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if there already exist a {@link Sensor|sensor} with the same {@link Sensor#name|name}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if a {@link GroupCreateOptions#parent|parent} was specified but no {@link Group|`Group`} was found with
     *     the specified name.
     * @see REST API endpoint <a href="../../rest/#operation-device-sensors-post">`POST /device/sensors`</a>.
     * @group API Endpoints
     */
    @Post("")
    public async create(
        @Body()
        data: SensorJSON,
        @Query()
        query: GroupCreateOptions
    ): Promise<void> {
        await this.sensorService.createSensor(Sensor.fromJSON(data), query.parent ?? null);
    }
    
    /**
     * Get a {@link Sensor|`Sensor`} with a specific {@link Sensor#name|`name`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Sensor#name|`name`} of the sensor to retrieve.
     * @returns {Promise<SensorJSON>} - The {@link Sensor|`Sensor`}'s {@link SensorJSON|serialization}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Sensor|`Sensor`} was found with the specified name.
     * @see REST API endpoint <a href="../../rest/#operation-device-sensors-name-get">`GET /device/sensors/{name}`</a>.
     * @group API Endpoints
     */
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
    
    /**
     * Edit a {@link Sensor|`Sensor`}'s properties, given its {@link Sensor#name|`name`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Sensor#name|`name`} of the sensor to edit.
     * @param {SensorEditChanges} edits - The HTTP request's body containing the {@link SensorEditChanges|properties} to be updated.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Sensor|`Sensor`} was found with the specified name.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a new {@link Sensor#name|`name`} was specified, but a {@link Sensor|sensor} with that name already
     *     exists.
     * @returns {Promise<void>}
     * @see REST API endpoint <a href="../../rest/#operation-device-sensors-name-patch">`PATCH /device/sensors/{name}`</a>.
     * @group API Endpoints
     */
    @Patch(":name")
    public async edit(
        @Param('name')
        name: string,
        @Body()
        edits: SensorEditChanges
    ): Promise<void> {
        await this.sensorService.editSensor(name, edits);
    }
    
    /**
     * Removes a {@link Sensor|`Sensor`} from the system by its name, if possible.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Sensor#name|`name`} of the {@link Sensor|sensor} to remove.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Sensor|`Sensor`} was found with the specified name.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the {@link Sensor|`Sensor`} cannot be deleted because it is linked to a {@link Mix|mix} that is
     *     referenced in a {@link Mix|mix} downstream.
     * @returns {Promise<void>}
     * @see REST API endpoint <a href="../../rest/#operation-device-sensors-name-delete">`DELETE /device/sensors/{name}`</a>.
     * @group API Endpoints
     */
    @Delete(":name")
    public async delete(
        @Param('name')
        name: string
    ): Promise<void> {
        await this.groupService.removeDevice(name, EntityType.SENSOR);
    }
    
    /**
     * Gets all the conflicts that prevent a {@link Sensor|`Sensor`} from being deleted.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Sensor#name|`name`} of the {@link Sensor|sensor} to check.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link Sensor|`Sensor`} and prevent it from being deleted. If empty, it means that
     *                                       the {@link Sensor|`Sensor`} can be deleted.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Sensor|`Sensor`} was found with the specified name.
     * @see REST API endpoint <a href="../../rest/#operation-device-sensors-name-delete-locks-get">`GET /device/sensors/{name}/delete-locks`</a>.
     * @group API Endpoints
     */
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param('name')
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.getDeleteLocks(EntityType.SENSOR, name);
    }
    
    
    /**
     * Move a {@link Sensor|`Sensor`} inside a different {@link Group|`Group`}, or take it out of any {@link Group|`Group`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Sensor#name|`name`} of the {@link Sensor|`Sensor`} to move.
     * @param {ChangeParentChange} data - The HTTP request's body containing the property {@link ChangeParentChange#parent|`parent`} indicating the {@link Group#name|name} of the new
     *                                    {@link Group|parent} or `null` to remove the parent.
     * @returns {Promise<void>}
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Sensor|`Sensor`} or destination {@link Group|`Group`} was found with the specified
     *                               names.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the {@link Sensor|`Sensor`} cannot be moved to the requested {@link Group|`Group`}, because it
     *                               would break dependencies in {@link Mix|`Mix`es} that depend on data related to the sensor or its linked mix.
     * @see REST API endpoint <a href="../../rest/#operation-device-sensors-name-parent-patch">`PATCH /device/sensors/{name}/parent`</a>.
     * @group API Endpoints
     */
    @Patch("/:name/parent")
    public async changeParent(
        @Param('name')
        name: string,
        @Body()
        data: ChangeParentChange
    ): Promise<void> {
        await this.groupService.changeParent(name, data.parent, EntityType.SENSOR);
    }
    
    /**
     * Returns information about all the {@link Group|`Group`s} that cannot be parents for this {@link Sensor|`Sensor`}, because they would break
     * dependencies inside the {@link Mix|mixes}. For example, if a {@link Sensor|sensor}'s {@link Mix|`Mix`} is referenced by a parent {@link Group|group}'s
     * {@link Mix|`Mix`}, this parent must remain in the hierarchy, otherwise the {@link Group|group}'s {@link Mix|mix} will not be able to reach it.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Sensor#name|`name`} of the {@link Sensor|`Sensor`}.
     * @returns {Promise<UnavailableParents>} The information about the {@link UnavailableParents|unavailable groups}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Sensor|`Sensor`} was found with the specified name.
     * @see REST API endpoint <a href="../../rest/#operation-device-sensors-name-unavailable-parents-get">`GET /device/sensors/{name}/unavailable-parents`</a>.
     * @group API Endpoints
     */
    @Get("/:name/unavailable-parents")
    public async getUnavailableParents(
        @Param('name')
        name: string
    ): Promise<UnavailableParents> {
        return this.groupService.getUnavailableParents(name, EntityType.SENSOR);
    }
    
    /**
     * Returns information about all the exposes that cannot be removed from this {@link Sensor|`Sensor`}, because they are referenced
     * in a {@link Mix|`Mix`} downstream.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link Sensor#name|`name`} of the {@link Sensor|`Sensor`}.
     * @returns {Promise<LockedExposes[]>} The information about the {@link LockedExposes|locked exposes}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Sensor|`Sensor`} was found with the specified name.
     * @see REST API endpoint <a href="../../rest/#operation-device-sensors-name-locked-exposes-get">`GET /device/sensors/{name}/locked-exposes`</a>.
     * @group API Endpoints
     */
    @Get("/:name/locked-exposes")
    public async getLockedExposes(
        @Param('name')
        name: string
    ): Promise<LockedExposes[]> {
        return await this.sensorService.getLockedExposes(name);
    }

}
