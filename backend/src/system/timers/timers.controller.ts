/**
 * This module contains the REST control logic for the <a href="../../rest/#tag-timers">`/system/timers`</a> api endpoint.
 *
 * @module
 */
import {BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post} from "@nestjs/common";
import {SystemTimer, SystemTimerJSON} from "@common/system/timer/system-timer";
import {TimersService} from "./timers.service";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";
import {SystemOrigin} from "@common/system/constants";
import {MixService} from "../../mixing/mix/mix.service";

// noinspection ES6UnusedImports
import type {ConflictException, NotFoundException} from '@nestjs/common';

/**
 * This class is the controller for all the api endpoints under <a href="../../rest/#tag-timers">`/system/timers`</a>,
 * regarding operations on {@link SystemTimer|`SystemTimer`s}.
 */
@Controller('system/timers')
export class TimersController {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {TimersService} timersService - The service handling {@link SystemTimer|`SystemTimer`} business logic.
     *                                        Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling mixing and delete locks logic.
     *                                  Instantiated by dependency injection.
     */
    constructor(
        private readonly timersService: TimersService,
        private readonly mixService: MixService
    ) {
    
    }
    
    /**
     * Get all {@link SystemTimer|`SystemTimer`s} in the system.
     *
     * @returns {Promise<SystemTimerJSON[]>} An array containing the resulting {@link SystemTimer|`SystemTimer`s}' {@link SystemTimerJSON|serializations}.
     * @see REST API endpoint <a href="../../rest/#operation-system-timers-get">`GET /system/timers`</a>.
     * @group API Endpoints
     */
    @Get("")
    public async getAll(): Promise<SystemTimerJSON[]> {
        const timers = await this.timersService.getAllTimers();
        return timers.map(timer => timer.toJSON());
    }
    
    /**
     * Adds a new {@link SystemTimer|`SystemTimer`} to the system.
     *
     * @param {SystemTimerJSON} data - The HTTP request's body containing the {@link SystemTimerJSON|serialization} of the timer to add.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the timer's {@link SystemTimer#occurrence|`occurrence`} is out of range for the chosen {@link SystemTimer#type|`type`}.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a timer with the same name already exists.
     * @see REST API endpoint <a href="../../rest/#operation-system-timers-post">`POST /system/timers`</a>.
     * @group API Endpoints
     */
    @Post("")
    public async create(
        @Body()
        data: SystemTimerJSON
    ): Promise<void> {
        if (!SystemTimer.checkOccurrence(data.occurrence, data.type)) {
            throw new BadRequestException("The occurrence is out of range for the chosen type")
        }
        await this.timersService.createTimer(SystemTimer.fromJSON(data));
    }
    
    /**
     * Updates an existing {@link SystemTimer|`SystemTimer`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link SystemTimer#name|`name`} of the timer to update.
     * @param {SystemTimerJSON} data - The HTTP request's body containing the updated {@link SystemTimerJSON|serialization}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemTimer|`SystemTimer`} was found with the specific name.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the occurrence is invalid or if the name in the body doesn't match the path.
     * @see REST API endpoint <a href="../../rest/#operation-system-timers-name-patch">`PATCH /system/timers/{name}`</a>.
     * @group API Endpoints
     */
    @Patch("/:name")
    public async edit(
        @Param("name")
        name: string,
        @Body()
        data: SystemTimerJSON
    ): Promise<void> {
        if (!SystemTimer.checkOccurrence(data.occurrence, data.type)) {
            throw new BadRequestException("The occurrence is out of range for the chosen type");
        }
        const systemTimer = SystemTimer.fromJSON(data);
        if (systemTimer.name != name) {
            throw new BadRequestException("Cannot change the name of the timer with this call");
        }
        await this.timersService.editTimer(systemTimer);
    }
    
    /**
     * Removes a {@link SystemTimer|`SystemTimer`} from the system by its name.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link SystemTimer#name|`name`} of the timer to remove.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the timer is used in a mix.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemTimer|`SystemTimer`} was found with the specific name.
     * @see REST API endpoint <a href="../../rest/#operation-system-timers-name-delete">`DELETE /system/timers/{name}`</a>.
     * @group API Endpoints
     */
    @Delete("/:name")
    public async delete(
        @Param("name")
        name: string
    ): Promise<void> {
        await this.timersService.deleteTimer(name);
    }
    
    /**
     * Gets all the conflicts that prevent a {@link SystemTimer|`SystemTimer`} from being deleted.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link SystemTimer#name|`name`} of the {@link SystemTimer|timer} to check.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the mixes that
     *                                       reference the {@link SystemTimer|`SystemTimer`} and prevent it from being deleted.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemTimer|`SystemTimer`} was found with the specific name.
     * @see REST API endpoint <a href="../../rest/#operation-system-timers-name-delete-locks-get">`GET /system/timers/{name}/delete-locks`</a>.
     * @group API Endpoints
     */
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param("name")
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.getDeleteLocks(SystemOrigin.TIMER, name);
    }
    
}
