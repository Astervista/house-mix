/**
 * This module contains the REST control logic for the <a href="../../rest/#tag-mixing">`/mixing`</a> api endpoint.
 *
 * @module
 */
// noinspection ES6UnusedImports
import type {ConflictException, InternalServerErrorException} from "@nestjs/common";
import {Body,BadRequestException, NotFoundException,Controller, Delete, Get, Param, ParseIntPipe, Patch, Put, Query} from "@nestjs/common";
import {MixService} from "./mix.service";
import {Mix, MixJSON} from "@common/mixing/mix/mix";
import {createMixInfo, mixInfoFromJSON, MixPositionInfoJSON, PutMixBodyJSON} from "@common/mixing/mix/rest-classes";
// noinspection ES6UnusedImports
import type {ExportedDatum, ExportedDatumJSON} from "@common/mixing/mix/datum";
// noinspection ES6UnusedImports
import type {MixingGraph, MixingGraphJSON} from "@common/mixing/mixing-graph";
import {MixLayout, Point} from "@common/mixing/mix/mix-layout";

// noinspection ES6UnusedImports
import type {Group} from "@common/devices/group/group";
// noinspection ES6UnusedImports
import type {Sensor} from "@common/devices/sensor/sensor";
// noinspection ES6UnusedImports
import type {Actuator} from "@common/devices/actuator/actuator";
// noinspection ES6UnusedImports
import type {Device} from "@common/devices/device";

/**
 * This class is the controller for all the api endpoints under <a href="../../rest/#tag-mixing">`/mixing`</a>, regarding operations on {@link Mix|`Mix`es}
 * and related operations.
 */
@Controller("mixing/")
export class MixController {
    
    /**
     * Creates a new instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} and dependency operations. Instantiated by dependency injection.
     */
    constructor(private readonly mixService: MixService) {}
    
    /**
     * Retrieves all the {@link Mix|`Mix`es} in the system.
     *
     * @returns {Promise<MixJSON[]>} - An array containing the resulting {@link Mix|`Mix`es}' {@link MixJSON|serializations}.
     * @see REST API endpoint <a href="../../rest/#operation-mixes-get">`GET /mixing/mixes/`</a>.
     * @group API Endpoints
     */
    @Get("mixes/")
    public async getAll(): Promise<MixJSON[]> {
        const mixes = await this.mixService.getAllMixes();
        return mixes.map(dev => dev.toJSON());
    }
    
    /**
     * Creates or updates a {@link Mix|`Mix`} in the system, with the provided information and position.
     *
     * @param {PutMixBodyJSON} data - The HTTP request's body containing the information about the {@link Mix|`Mix`} to create, and the context it's linked to.
     * @returns {Promise<{id: number}>} - The id of the created {@link Mix|`Mix`}.
     * @throws {BadRequestException} {@link BadRequestException|`BadRequestException`} if:
     *                               - the provided position information is not correct or fails deserialization.
     *                               - the request is an update and the mix position is changed
     *                               - the request is an update and the mix id does not exist yet
     *                               - the request is an update and the position pointed to doesn't have the mix assigned to it already
     *                               - inputs/imports/outputs are duplicated
     *                               - inputs lack corresponding imports
     *                               - the mix is linked to an {@link Actuator|`Actuator`} and the outputs of the mix contain outputs that are not defined in
     *                                 the actuator's {@link Actuator#exposes|`exposes`}, or that are defined differently.
     *                               - the mix contains cycles or connections are invalid.
     * @throws {NotFoundException} {@link NotFoundException|`NotFoundException`} if the target {@link Sensor|`Sensor`}, {@link Actuator|`Actuator`} or {@link Group|`Group`} cannot be found.
     * @throws {ConflictException} {@link ConflictException|`ConflictException`} if an update removes or changes outputs that are currently in use by other mixes downstream,
     *                             or if the inputs are not reachable by a mix in the specified position.
     * @throws {InternalServerErrorException} {@link InternalServerErrorException|`InternalServerErrorException`} If an unexpected state occurs during ID assignment or phase handling.
     * @see REST API endpoint <a href="../../rest/#operation-mixes-put">`PUT /mixing/mixes/`</a>.
     * @group API Endpoints
     */
    @Put("mixes/")
    public async create(
        @Body()
        data: PutMixBodyJSON
    ): Promise<{ id: number }> {
        const mixInfo = mixInfoFromJSON(data.position);
        if (mixInfo == null) {
            throw new BadRequestException("The position information is not correct");
        }
        return {
            id: await this.mixService.putMix(Mix.fromJSON(data.mix), mixInfo)
        };
    }
    
    
    /**
     * Retrieves a specific {@link Mix|`Mix`} by its unique id number.
     *
     * @param {number} id - The HTTP request's path parameter with the unique identifier of the {@link Mix|`Mix`} to retrieve.
     * @returns {Promise<MixJSON>} - The {@link MixJSON|serialization} of the requested {@link Mix|`Mix`}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Mix|`Mix`} with the specified ID exists.
     * @group API Endpoints
     */
    @Get("mixes/:id")
    public async getById(@Param("id", new ParseIntPipe()) id: number): Promise<MixJSON> {
        const mix = await this.mixService.getMixById(id);
        if (mix) {
            return mix.toJSON();
        } else {
            throw new NotFoundException(`Mix with id ${id} not found`);
        }
    }
    
    /**
     * Updates an existing {@link Mix|`Mix`} by its ID.
     *
     * @param {MixJSON} newMix - The HTTP request's body containing the updated {@link Mix|`Mix`} data.
     * @param {number} id - The HTTP request's path parameter with the unique identifier of the {@link Mix|`Mix`} to update.
     * @returns {Promise<void>}
     * @throws {BadRequestException} {@link BadRequestException|`BadRequestException`} if:
     *                               - the sent mix id doesn't match with the path id requested,
     *                               - inputs/imports/outputs are duplicated,
     *                               - inputs lack corresponding imports,
     *                               - the mix is linked to an {@link Actuator|`Actuator`} and the outputs of the mix contain outputs that are not defined in
     *                                 the actuator's {@link Actuator#exposes|`exposes`}, or that are defined differently.
     *                               - the mix contains cycles or connections are invalid.
     * @throws {NotFoundException} {@link NotFoundException|`NotFoundException`} if no {@link Mix|`Mix`} with the specified ID exists.
     * @throws {ConflictException} {@link ConflictException|`ConflictException`} if an update removes or changes outputs that are currently in use by other {@link Mix|`Mix`es} downstream,
     *                             or if the inputs are not reachable by a mix in the specified position.
     * @throws {InternalServerErrorException} {@link InternalServerErrorException|`InternalServerErrorException`} If an unexpected state occurs during ID assignment or phase handling.
     * @see REST API endpoint <a href="../../rest/#operation-mixes-id-patch">`PATCH /mixing/mixes/:id`</a>.
     * @group API Endpoints
     */
    @Patch("mixes/:id")
    public async editMix(@Body() newMix: MixJSON, @Param("id", new ParseIntPipe()) id: number): Promise<void> {
        const mix = Mix.fromJSON(newMix);
        if (mix.id != id) {
            throw new BadRequestException("The sent mix id doesn't match with the path id requested");
        }
        const position = await this.mixService.getMixPosition(id);
        await this.mixService.putMix(mix, position);
    }
    
    /**
     * Deletes a {@link Mix|`Mix`} from the system.
     *
     * @param {number} id - The HTTP request's path parameter with the unique identifier of the {@link Mix|`Mix`} to delete.
     * @returns {Promise<void>}
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no mix with the specified ID exists.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the mix cannot be deleted because it is
     *                             currently being used or referenced by other mixes or entities downstream.
     * @see REST API endpoint <a href="../../rest/#operation-mixes-id-delete">`DELETE /mixing/mixes/:id`</a>.
     * @group API Endpoints
     */
    @Delete("mixes/:id")
    public async deleteMix(@Param("id", new ParseIntPipe()) id: number): Promise<void> {
        await this.mixService.deleteMix(id);
    }
    
    /**
     * Retrieves the {@link MixPositionInfoJSON|position information} (context) for a specific {@link Mix|`Mix`}.
     *
     * @param {number} id - The HTTP request's path parameter with the unique identifier of the {@link Mix|`Mix`}.
     * @returns {Promise<MixPositionInfoJSON>} - The serialized {@link MixPositionInfoJSON|position information}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Mix|`Mix`} with the specified ID exists.
     * @see REST API endpoint <a href="../../rest/#operation-mixes-id-position-get">`GET /mixing/mixes/:id/position`</a>.
     * @group API Endpoints
     */
    @Get("mixes/:id/position")
    public async getMixPosition(@Param("id", new ParseIntPipe()) id: number): Promise<MixPositionInfoJSON> {
        return MixPositionInfoJSON.toJSON(await this.mixService.getMixPosition(id));
    }
    
    /**
     * Retrieves the UI {@link MixLayout|layout} for a specific {@link Mix|`Mix`}.
     *
     * @param {number} id - The HTTP request's path parameter with the unique identifier of the {@link Mix|`Mix`}.
     * @returns {Promise<MixLayout>} - The {@link MixLayout|layout} including node positions.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Mix|`Mix`} with the specified ID exists.
     * @see REST API endpoint <a href="../../rest/#operation-mixes-id-layout-get">`GET /mixing/mixes/:id/layout`</a>.
     * @group API Endpoints
     */
    @Get("mixes/:id/layout")
    public async getMixLayout(@Param("id", new ParseIntPipe()) id: number): Promise<MixLayout> {
        return await this.mixService.getMixLayout(id);
    }
    
    /**
     * Saves the UI {@link MixLayout|layout} for a specific {@link Mix|`Mix`}.
     *
     * @param {number} id - The HTTP request's path parameter with the unique identifier of the {@link Mix|`Mix`}.
     * @param {MixLayout} layout - The HTTP request's body containing the {@link MixLayout|layout} to save.
     * @returns {Promise<void>} - A promise that resolves when the layout is saved.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the layout data is malformed or contains invalid coordinates.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Mix|`Mix`} with the specified ID exists.
     * @see REST API endpoint <a href="../../rest/#operation-mixes-id-layout-put">`PUT /mixing/mixes/:id/layout`</a>.
     * @group API Endpoints
     */
    @Put("mixes/:id/layout")
    public async saveLayout(@Param("id", new ParseIntPipe()) id: number, @Body() layout: MixLayout): Promise<void> {
        (layout as { nodePositions: Record<string, Point> | null }).nodePositions ??= {};
        const oldPositions   = layout.nodePositions;
        layout.nodePositions = {};
        for (const key of Object.keys(oldPositions)) {
            if (isNaN(parseInt(key))) {
                throw new BadRequestException(`Invalid node index for position (${key} is not an integer)`);
            }
            const oldPosition = oldPositions[key] as unknown;
            if (typeof oldPosition != "object") {
                throw new BadRequestException(`Invalid node position object (${JSON.stringify(oldPosition)} is not a Point)`);
            } else if (oldPosition != null) {
                const checkValue = oldPosition as { x?: unknown, y?: unknown };
                if (typeof checkValue.x != "number" || typeof checkValue.y != "number") {
                    throw new BadRequestException(`Node position must contain numerical x and y`);
                } else {
                    layout.nodePositions[key] = {x: checkValue.x, y: checkValue.y};
                }
            }
        }
        await this.mixService.saveMixLayout(id, layout);
    }
    
    /**
     * Retrieves the list of available {@link ExportedDatum|`ExportedDatum`} that can be imported by a {@link Mix|`Mix`} at a given position.
     *
     * @param {Record<string, string>} queryParams - The HTTP request's query parameters defining the position (e.g., sensorId, actuatorId).
     * @returns {Promise<ExportedDatumJSON[]>} - A list of available {@link ExportedDatum|`ExportedDatum`}'s {@link ExportedDatumJSON|serializations} for using as imports.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the position filters are invalid.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if the provided position does not resolve to a known position.
     * @see REST API endpoint <a href="../../rest/#operation-available-imports-get">`GET /mixing/available-imports/`</a>.
     * @group API Endpoints
     */
    @Get("available-imports/")
    public async getAvailableImports(
        @Query()
        queryParams: Record<string, string>
    ): Promise<ExportedDatumJSON[]> {
        const mixPosition = createMixInfo(queryParams);
        if (mixPosition == null) {
            throw new BadRequestException("The filter defining the position is not valid");
        }
        const imports = await this.mixService.getAvailableImports(mixPosition);
        return imports.map(imp => imp.toJSON());
    }
    
    /**
     * Retrieves the global mixing graph representing all connections between mixes assigned to various locations of the system.
     *
     * @returns {Promise<MixingGraphJSON>} - The {@link MixingGraph|`MixingGraph`}'s {@link MixingGraphJSON|serialization}.
     * @see REST API endpoint <a href="../../rest/#operation-graph-get">`GET /mixing/graph`</a>.
     * @group API Endpoints
     */
    @Get("graph")
    public async getGraph(): Promise<MixingGraphJSON> {
        return (await this.mixService.getGraph()).toJSON();
    }
    
    /**
     * Retrieves the names of all {@link Mix|`Mix`es} not associated to any {@link Device|`Device} or {@link Group|`Group`}, but positioned
     * in the central part of the elaboration, after all the elaboration regarding data from the {@link Sensor|`Sensor`s} has been done
     * and before the elaboration regarding data to be sent to the {@link Actuator|`Actuator`s} gets started.
     *
     * @returns {Promise<string[]>} - An array of names to identify the {@link Mix|`Mix`es} positioned in the center.
     * @see REST API endpoint <a href="../../rest/#operation-center-mixes-names-get">`GET /mixing/center-mixes-names`</a>.
     * @group API Endpoints
     */
    @Get("center-mixes-names")
    public async getCenterMixNames(): Promise<string[]> {
        return (await this.mixService.getCenterMixes()).map(centerMix => centerMix.name);
    }
    
}
