/**
 * This module contains the REST control logic for the <a href="../../rest/#tag-parameters">`/system/parameters`</a> api endpoint.
 *
 * @module
 */
// noinspection ES6UnusedImports
import type {ConflictException, NotFoundException, BadRequestException} from '@nestjs/common';
import { Body, Controller, Delete, Get, Param, Patch, Post} from '@nestjs/common';
import { ParametersService } from './parameters.service';
import { SystemParameter, SystemParameterJSON } from '@common/system/parameter/system-parameter';
import { SetParameterBody } from '@common/system/parameter/rest-classes';
import { MixPositionInfo } from '@common/mixing/mix/rest-classes';
import {MixService} from '../../mixing/mix/mix.service';
import { SystemOrigin } from '@common/system/constants';

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';
// noinspection ES6UnusedImports
import type {DatumType} from '@common/mixing/mix/datum';


/**
 * This class is the controller for all the api endpoints under <a href="../../rest/#tag-parameters">`/system/parameters`</a>,
 * regarding operations on {@link SystemParameter|`SystemParameter`s}.
 */
@Controller("/system/parameters/")
export class ParametersController {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {ParametersService} parametersService - The service handling {@link SystemParameter|`SystemParameter`} business logic.
     *                                                Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling mixing and delete locks logic.
     *                                  Instantiated by dependency injection.
     */
    constructor(
        private readonly parametersService: ParametersService,
        private readonly mixService: MixService
    ) {
    
    }
    
    /**
     * Get all {@link SystemParameter|`SystemParameter`s} in the system.
     *
     * @returns {Promise<SystemParameterJSON[]>} An array containing the resulting {@link SystemParameter|`SystemParameter`s}' {@link SystemParameterJSON|serializations}.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-get">`/system/parameters`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("")
    public async getAll(): Promise<SystemParameterJSON[]> {
        const parameters = await this.parametersService.getAllParameters();
        return parameters.map(parameter => parameter.toJSON());
    }
    
    
    /**
     * Adds a new {@link SystemParameter|`SystemParameter`} to the system.
     *
     * @param {SystemParameterJSON} data - The HTTP request's body containing the {@link SystemParameterJSON|serialization} of the parameter to add.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a parameter with the same name already exists.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-post">`/system/parameters`</a>.
     * @group API Endpoints
     * @post
     */
    @Post("")
    public async create(
        @Body()
        data: SystemParameterJSON
    ): Promise<void> {
        await this.parametersService.createParameter(SystemParameter.fromJSON(data));
    }
    
    /**
     * Removes a {@link SystemParameter|`SystemParameter`} from the system by its name.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link SystemParameter#name|`name`} of the parameter to remove.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the parameter is used in a mix.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-name-delete">`/system/parameters/{name}`</a>.
     * @group API Endpoints
     * @delete
     */
    @Delete("/:name")
    public async delete(
        @Param("name")
        name: string
    ): Promise<void> {
        await this.parametersService.deleteParameter(name);
    }
    
    /**
     * Sets the value of a {@link SystemParameter|`SystemParameter`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link SystemParameter#name|`name`} of the parameter to update.
     * @param {SetParameterBody} body - The HTTP request's body containing the new value.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the provided value is not valid for the chosen parameter.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-name-value-patch">`/system/parameters/{name}/value`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch("/:name/value")
    public async set(
        @Param("name")
        name: string,
        @Body()
        body: SetParameterBody
    ): Promise<void> {
        await this.parametersService.setValue(name, body.value);
    }
    
    /**
     * Gets the value of a {@link SystemParameter|`SystemParameter`}.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link SystemParameter#name|`name`} of the parameter.
     * @returns {Promise<{ value: unknown }>} An object containing the current value of the parameter.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-name-value-get">`/system/parameters/{name}/value`</a>.
     * @see {@link DatumType|`DatumType`} for a description of the return types.
     * @group API Endpoints
     * @get
     */
    @Get("/:name/value")
    public async getValue(
        @Param("name")
        name: string
    ): Promise<{ value: unknown }> {
        return {
            value: await this.parametersService.getValue(name)
        };
    }
    
    /**
     * Gets all the conflicts that prevent a {@link SystemParameter|`SystemParameter`} from being deleted.
     *
     * @param {string} name - The HTTP request's path parameter with the {@link SystemParameter#name|`name`} of the {@link SystemParameter|parameter} to check.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link SystemParameter|`SystemParameter`} and prevent it from being deleted.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-name-delete-locks-get">`/system/parameters/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param("name")
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.getDeleteLocks(SystemOrigin.PARAMETER, name);
    }
    
}
