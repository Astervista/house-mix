/**
 * This module contains the {@link MixingService|`MixingService`}.
 *
 * @module
 */
import {Injectable} from '@angular/core';
import {BasePath, Delete, Get, Patch, Put} from '../utils/networking/decorators';
import {Mix, MixJSON} from '@common/mixing/mix/mix';
import {HttpClient} from '@angular/common/http';
import {mixInfoFromJSON, MixPositionInfo, MixPositionInfoJSON, PutMixBodyJSON} from '@common/mixing/mix/rest-classes';
import {ExportedDatum} from '@common/mixing/mix/datum';
import {MixingGraph} from '@common/mixing/mixing-graph';
import {MixLayout} from '@common/mixing/mix/mix-layout';
import {Group} from 'common/dist/devices/group/group';

// noinspection ES6UnusedImports
import type {HttpErrorResponse} from '@angular/common/http';
// noinspection ES6UnusedImports
import type {NodeGroup} from '../components/mixing/mix/mix-ui-manager';
// noinspection ES6UnusedImports
import type {ElaborationNode} from '@common/mixing/mix/elaboration-node';
// noinspection ES6UnusedImports
import type {Actuator} from '@common/devices/actuator/actuator';
// noinspection ES6UnusedImports
import type {Sensor} from '@common/devices/sensor/sensor';
// noinspection ES6UnusedImports
import type {Device} from '@common/devices/device';

/**
 * This is the service that handles all REST requests to the `"/groups/*"` endpoints regarding
 * {@link Mix|`Mix`es}.
 */
@Injectable({
                providedIn: 'root'
            })
@BasePath('/mixing')
export class MixingService {

    /**
     * Creates an instance of the service. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {HttpClient} httpClient - - The http service. Instantiated by dependency injection.
     */
    constructor(private httpClient: HttpClient) { }

    /**
     * Retrieves all the {@link Mix|`Mix`es} in the system.
     *
     * @returns {Promise<Mix[]>} - An array containing the resulting {@link Mix|`Mix`es}.
     * @apiEndpoint <a href="../../rest/#operation-mixes-get">`/mixing/mixes/`</a>.
     * @group API Endpoints
     * @get
     */
    @Get(
        '/',
        {
            result:        Mix,
            resultIsArray: true,
        }
    )
    public getAllMixes!: () => Promise<Mix[]>;

    /**
     * Creates or updates a {@link Mix|`Mix`} in the system, with the provided information and position.
     *
     * @param {PutMixBodyJSON} value - The information about the {@link Mix|`Mix`} to create, and the context it's linked to.
     * @returns {Promise<{id: number}>} - The id of the created {@link Mix|`Mix`}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if :
     *                               - the provided position information is not correct or fails deserialization.
     *                               - the request is an update and the mix position is changed
     *                               - the request is an update and the mix id does not exist yet
     *                               - the request is an update and the position pointed to doesn't have the mix assigned to it already
     *                               - inputs/imports/outputs are duplicated
     *                               - inputs lack corresponding imports
     *                               - the mix is linked to an {@link Actuator|`Actuator`} and the outputs of the mix contain outputs that are not defined in
     *                                 the actuator's {@link Actuator#exposes|`exposes`}, or that are defined differently.
     *                               - the mix contains cycles or connections are invalid.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  the target {@link Sensor|`Sensor`}, {@link Actuator|`Actuator`} or {@link Group|`Group`} cannot be found.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  an update removes or changes outputs that are currently in use by other mixes downstream,
     *                             or if the inputs are not reachable by a mix in the specified position.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `500` if  an unexpected state occurs during ID assignment or phase handling.
     * @apiEndpoint <a href="../../rest/#operation-mixes-put">`/mixing/mixes/`</a>.
     * @group API Endpoints
     * @put
     */
    @Put<PutMixBodyJSON, MixPathParams>('/mixes')
    private putMixRest!: (value: PutMixBodyJSON) => Promise<MixPathParams>;

    /**
     * Retrieves a specific {@link Mix|`Mix`} by its unique id number.
     *
     * @param {MixPathParams} pathParams - The HTTP request's path parameters with the unique identifier of the {@link Mix|`Mix`} to retrieve.
     * @returns {Promise<Mix>} - The requested {@link Mix|`Mix`}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Mix|`Mix`} with the specified ID exists.
     * @apiEndpoint <a href="../../rest/#operation-mixes-id-patch">`/mixing/mixes/:id`</a>.
     * @group API Endpoints
     * @get
     */
    @Get('/mixes/:id/', {result: Mix, resultIsArray: false})
    public getMix!: (pathParams: MixPathParams) => Promise<Mix>;

    /**
     * Updates an existing {@link Mix|`Mix`} by its ID.
     *
     * @param {MixJSON} newMix - The updated {@link Mix|`Mix`} data.
     * @param {MixPathParams} pathParams - The HTTP request's path parameters with the unique identifier of the {@link Mix|`Mix`} to update.
     * @returns {Promise<void>}
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if :
     *                               - the sent mix id doesn't match with the path id requested,
     *                               - inputs/imports/outputs are duplicated,
     *                               - inputs lack corresponding imports,
     *                               - the mix is linked to an {@link Actuator|`Actuator`} and the outputs of the mix contain outputs that are not defined in
     *                                 the actuator's {@link Actuator#exposes|`exposes`}, or that are defined differently.
     *                               - the mix contains cycles or connections are invalid.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Mix|`Mix`} with the specified ID exists.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  an update removes or changes outputs that are currently in use by other {@link Mix|`Mix`es} downstream,
     *                             or if the inputs are not reachable by a mix in the specified position.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `500` if  an unexpected state occurs during ID assignment or phase handling.
     * @apiEndpoint <a href="../../rest/#operation-mixes-id-patch">`/mixing/mixes/:id`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<Mix, null>('/mixes/:id/', {result: null})
    public editMix!: (newMix: Mix, pathParams: MixPathParams) => Promise<void>;

    /**
     * Deletes a {@link Mix|`Mix`} from the system.
     *
     * @param {MixPathParams} pathParams - The HTTP request's path parameters with the unique identifier of the {@link Mix|`Mix`} to delete.
     * @returns {Promise<void>}
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no mix with the specified ID exists.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  the mix cannot be deleted because it is
     *                             currently being used or referenced by other mixes or entities downstream.
     * @apiEndpoint <a href="../../rest/#operation-mixes-id-delete">`/mixing/mixes/:id`</a>.
     * @group API Endpoints
     * @delete
     */
    @Delete('/mixes/:id/')
    public deleteMix!: (pathParams: MixPathParams) => Promise<void>;

    /**
     * Retrieves the {@link MixPositionInfo|position information} (context) for a specific {@link Mix|`Mix`}.
     *
     * @param {MixPathParams} pathParams - The HTTP request's path parameters with the unique identifier of the {@link Mix|`Mix`}.
     * @returns {Promise<MixPositionInfo>} - The {@link MixPositionInfoJSON|position information}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Mix|`Mix`} with the specified ID exists.
     * @apiEndpoint <a href="../../rest/#operation-mixes-id-position-get">`/mixing/mixes/:id/position`</a>.
     * @group API Endpoints
     * @get
     */
    @Get('/mixes/:id/position', {result: MixPositionInfoJSON})
    private getMixPositionRest!: (pathParams: MixPathParams) => Promise<MixPositionInfoJSON>;

    /**
     * Retrieves the UI {@link MixLayout|layout} for a specific {@link Mix|`Mix`}.
     *
     * @param {MixPathParams} pathParams - The HTTP request's path parameters with the unique identifier of the {@link Mix|`Mix`}.
     * @returns {Promise<MixLayout>} - The {@link MixLayout|layout} including {@link ElaborationNode|`ElaborationNode`} positions and {@link NodeGroup|`NodeGroup`s}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Mix|`Mix`} with the specified ID exists.
     * @apiEndpoint <a href="../../rest/#operation-mixes-id-layout-get">`/mixing/mixes/:id/layout`</a>.
     * @group API Endpoints
     * @get
     */
    @Get('/mixes/:id/layout', {result: MixLayout})
    public getMixLayout!: (pathParams: MixPathParams) => Promise<MixLayout>;

    /**
     * Saves the UI {@link MixLayout|layout} for a specific {@link Mix|`Mix`}.
     *
     * @param {MixLayout} layout - The {@link MixLayout|layout} to save.
     * @param {MixPathParams} pathParams - The HTTP request's path parameters with the unique identifier of the {@link Mix|`Mix`}.
     * @returns {Promise<void>} - A promise that resolves when the layout is saved.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  the layout data is malformed or contains invalid coordinates.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Mix|`Mix`} with the specified ID exists.
     * @apiEndpoint <a href="../../rest/#operation-mixes-id-layout-put">`/mixing/mixes/:id/layout`</a>.
     * @group API Endpoints
     * @put
     */
    @Put<MixLayout, null>('/mixes/:id/layout', {result: null})
    public updateMixLayout!: (layout: MixLayout, pathParams: MixPathParams) => Promise<void>;

    /**
     * Retrieves the list of available {@link ExportedDatum|`ExportedDatum`} that can be imported by a {@link Mix|`Mix`} at a given position.
     *
     * @param {Record<string, string>} queryParams - The options defining the position (e.g., sensorId, actuatorId).
     * @returns {Promise<ExportedDatum[]>} - A list of available {@link ExportedDatum|`ExportedDatum`} for using as imports.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  the position filters are invalid.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  the provided position does not resolve to a known position.
     * @apiEndpoint <a href="../../rest/#operation-available-imports-get">`/mixing/available-imports/`</a>.
     * @group API Endpoints
     * @get
     */
    @Get(
        '/available-imports/',
        {
            result:        ExportedDatum,
            resultIsArray: true,
            queryParams:   {
                target:         true,
                phase:          true,
                actuatorName:   false,
                actuatorDisplayName: false,
                groupName:      false,
                groupDisplayName: false,
                sensorName:     false,
                sensorDisplayName: false,
                mixName:        false,
                mixDisplayName: false
            }
        }
    )
    private getAvailableImportsRest!: (queryParams: {
        phase: string
        target: string
        actuatorName?: string
        actuatorDisplayName?: string
        groupName?: string
        groupDisplayName?: string
        sensorName?: string
        sensorDisplayName?: string
        mixName?: string,
        mixDisplayName?: string
    }) => Promise<ExportedDatum[]>;

    /**
     * Retrieves the global mixing graph representing all connections between {@link Mix|`Mix`es} assigned to various locations of the system.
     *
     * @returns {Promise<MixingGraph>} - The {@link MixingGraph|`MixingGraph`}.
     * @apiEndpoint <a href="../../rest/#operation-graph-get">`/mixing/graph`</a>.
     * @group API Endpoints
     * @get
     */
    @Get('/graph/', {result: MixingGraph})
    public getGraph!: () => Promise<MixingGraph>;

    /**
     * Retrieves the names of all {@link Mix|`Mix`es} not associated to any {@link Device|`Device} or {@link Group|`Group`}, but positioned
     * in the central part of the elaboration, after all the elaboration regarding data from the {@link Sensor|`Sensor`s} has been done
     * and before the elaboration regarding data to be sent to the {@link Actuator|`Actuator`s} gets started.
     *
     * @returns {Promise<string[]>} - An array of names to identify the {@link Mix|`Mix`es} positioned in the center.
     * @apiEndpoint <a href="../../rest/#operation-center-mixes-names-get">`/mixing/center-mixes-names`</a>.
     * @group API Endpoints
     * @get
     */
    @Get('/center-mixes-names', {result: String, resultIsArray: true})
    public getCenterMixNames!: () => Promise<string[]>;

    /**
     * Retrieves the {@link MixPositionInfo|position information} (context) for a specific {@link Mix|`Mix`}.
     *
     * @param {MixPathParams} pathParams - The HTTP request's path parameters with the unique identifier of the {@link Mix|`Mix`}.
     * @returns {Promise<MixPositionInfo>} - The {@link MixPositionInfoJSON|position information}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Mix|`Mix`} with the specified ID exists.
     * @throws {Error} - {@link Error|`Error`} if the data coming from the server cannot be deserialized.
     * @apiEndpoint <a href="../../rest/#operation-mixes-id-position-get">`/mixing/mixes/:id/position`</a>.
     * @group API Endpoints
     * @get
     * @apiProxy
     */
    public async getMixPositionInfo(pathParams: MixPathParams): Promise<MixPositionInfo> {
        const json   = await this.getMixPositionRest(pathParams);
        const result = mixInfoFromJSON(json);
        if (result == null) {
            const error = new Error('Wrong mix position info');
            error.cause = 'WRONG_MIX_POSITION';
            throw error;
        } else {
            return result;
        }
    }

    /**
     * Retrieves the list of available {@link ExportedDatum|`ExportedDatum`} that can be imported by a {@link Mix|`Mix`} at a given position.
     *
     * @param {MixPositionInfoJSON} mixPositionInfoJSON - The position of the {@link Mix|`Mix`}.
     * @returns {Promise<ExportedDatum[]>} - A list of available {@link ExportedDatum|`ExportedDatum`} for using as imports.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  the position filters are invalid.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  the provided position does not resolve to a known position.
     * @apiEndpoint <a href="../../rest/#operation-available-imports-get">`/mixing/available-imports/`</a>.
     * @group API Endpoints
     * @get
     * @apiProxy
     */
    public async getAvailableImports(mixPositionInfoJSON: MixPositionInfoJSON): Promise<ExportedDatum[]> {
        return this.getAvailableImportsRest({
                                                phase:               mixPositionInfoJSON.phase,
                                                target:              mixPositionInfoJSON.target,
                                                actuatorName:        mixPositionInfoJSON.actuatorName,
                                                actuatorDisplayName: mixPositionInfoJSON.actuatorDisplayName,
                                                groupName:           mixPositionInfoJSON.groupName,
                                                groupDisplayName:    mixPositionInfoJSON.groupDisplayName,
                                                sensorName:          mixPositionInfoJSON.sensorName,
                                                sensorDisplayName:   mixPositionInfoJSON.sensorDisplayName,
                                                mixName:             mixPositionInfoJSON.mixName,
                                                mixDisplayName:      mixPositionInfoJSON.mixDisplayName
                                            });
    }

    /**
     * Updates a {@link Mix|`Mix`}, given its position in the system. If the {@link Mix#id|`id`} is `"NEW"`, proceed to its creation.
     *
     * @param {Mix} mix - The {@link Mix|`Mix`} to update.
     * @param {MixPositionInfo} position - The position of the mix to update.
     * @returns {Promise<number>} - The new {@link Mix#id|`Mix.id`}.
     */
    public async updateMix(mix: Mix, position: MixPositionInfo): Promise<number> {
        if (mix.id == 'NEW') {
            return (await this.putMixRest({
                                              position: MixPositionInfoJSON.toJSON(position),
                                              mix:      mix.toJSON()
                                          })).id;
        } else {
            await this.editMix(mix, {id: mix.id});
            return mix.id;
        }
    }


}




/**
 * A class that contains the id of a {@link Mix|`Mix`} for communication.
 */
export interface MixPathParams {
    /** The {@link Mix#id|`id`}. */
    id: number
}
