/**
 * This module contains the {@link DeviceService|`DeviceService`}.
 *
 * @module
 */
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Actuator} from '@common/devices/actuator/actuator';
import {Sensor} from '@common/devices/sensor/sensor';
import {ActuatorCreateOptions, ActuatorEditChanges} from '@common/devices/actuator/rest-classes';
import {SensorCreateOptions, SensorEditChanges} from '@common/devices/sensor/rest-classes';
import {BasePath, Delete, Get, Patch, Post} from '../utils/networking/decorators';
import {ChangeParentChange} from '@common/devices/group/rest-classes';
import {GetDevicesOptions, LockedExposes, UnavailableParents} from '@common/devices/rest-classes';
import {EntityPathParams} from '@common/utils/rest-classes';
import {mixInfoFromJSON, MixPositionInfo, MixPositionInfoJSON} from '@common/mixing/mix/rest-classes';

// noinspection ES6UnusedImports
import type {Device} from '@common/devices/device';
// noinspection ES6UnusedImports
import type {HttpErrorResponse} from '@angular/common/http';
// noinspection ES6UnusedImports
import type {Group} from '@common/devices/group/group';
// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';


/**
 * This is the service that handles all REST requests to the `"/device/*"` endpoints regarding
 * {@link Device|`Device`s} ({@link Actuator|`Actuator`s} and {@link Sensor|`Sensor`s}).
 */
@Injectable({
    providedIn: 'root'
})
@BasePath("/device")
export class DeviceService {

    /**
     * Creates an instance of the service. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {HttpClient} httpClient - - The http service. Instantiated by dependency injection.
     */
    constructor(private httpClient: HttpClient) { }

    /**
     * Get all {@link Actuator|`Actuator`s} in the system, optionally filtered by {@link Mix|`Mix`}.
     *
     * @param {GetDevicesOptions} options - The parameters to filter the results.
     * @returns {Promise<Actuator[]>} An array containing the resulting {@link Actuator|`Actuator`s}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400`
     *                               if both {@link GetDevicesOptions#mix|`mix`} and {@link GetDevicesOptions#anyMixed|`anyMixed`} are
     *                               specified at the same time.
     * @apiEndpoint <a href="../../rest/#operation-device-actuators-get">`/device/actuators`</a>
     * @group API Endpoints
     * @get
     */
    @Get<Actuator>(
        "/actuators/",
        {
            result: Actuator,
            resultIsArray: true,
            queryParams: {
                mix: false,
                anyMixed: false,
            }
        })
    public getActuators!: (options?: GetDevicesOptions) => Promise<Actuator[]>;

    /**
     * Creates a new device of type {@link Actuator|`Actuator`} in the system.
     *
     * @param {Actuator} actuator - The information about the {@link Actuator|`Actuator`} to be created.
     * @param {ActuatorCreateOptions} options - The additional optional info for the creation, namely the name of the {@link Group|`Group`} where the
     *                                       actuator will be placed.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  there already exist an {@link Actuator|actuator}
     *     with the same {@link Actuator#name|name}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  a {@link ActuatorCreateOptions#parent|parent} was
     *     specified but no {@link Group|`Group`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-actuators-post">`/device/actuators`</a>.
     * @group API Endpoints
     * @post
     */
    @Post<Actuator, null>(
        '/actuators/',
        {
            queryParams: {
                parent: false
            }
        }
    )
    public createActuator!: (actuator: Actuator, options?: ActuatorCreateOptions) => Promise<void>;

    /**
     * Get an {@link Actuator|`Actuator`} with a specific {@link Actuator#name|`name`}.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Actuator#name|`name`} of the actuator to retrieve.
     * @returns {Promise<Actuator>} - The {@link Actuator|`Actuator`}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Actuator|`Actuator`} was found with the
     *     specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-actuators-name-get">`/device/actuators/{name}`</a>.
     * @group API Endpoints
     * @get
     */
    @Get<Actuator>(
        '/actuators/:name',
        {
            result: Actuator
        }
    )
    public getActuatorByName!: (pathParams: EntityPathParams) => Promise<Actuator>;

    /**
     * Edit an {@link Actuator|`Actuator`}'s properties, given its {@link Actuator#name|`name`}.
     *
     * @param {ActuatorEditChanges} changes - The {@link ActuatorEditChanges|properties} to be updated.
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Actuator#name|`name`} of the actuator to edit.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Actuator|`Actuator`} was found with the specified name.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  a new {@link Actuator#name|`name`} was specified, but an {@link Actuator|actuator} with that name
     *     already exists.
     * @returns {Promise<void>}
     * @apiEndpoint <a href="../../rest/#operation-device-actuators-name-patch">`/device/actuators/{name}`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<ActuatorEditChanges, null>(
        '/actuators/:name'
    )
    public editActuator!: (changes: ActuatorEditChanges, pathParams: EntityPathParams) => Promise<void>;

    /**
     * Removes an {@link Actuator|`Actuator`} from the system by its name, if possible.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Actuator#name|`name`} of the actuator to remove.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Actuator|`Actuator`} was found with the specified name.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  the {@link Actuator|`Actuator`} cannot be deleted because it is linked to a {@link Mix|mix} that is
     *     referenced in a {@link Mix|mix} downstream.
     * @returns {Promise<void>}
     * @apiEndpoint <a href="../../rest/#operation-device-actuators-name-delete">`/device/actuators/{name}`</a>.
     * @group API Endpoints
     * @delete
     */
    @Delete<null, null>(
        '/actuators/:name/'
    )
    public deleteActuator!: (pathParams: EntityPathParams) => Promise<void>;

    /**
     * Gets all the conflicts that prevent an {@link Actuator|`Actuator`} from being deleted.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Actuator#name|`name`} of the actuator to check.
     * @returns {Promise<MixPositionInfoJSON[]>} A list of serialized {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link Actuator|`Actuator`} and prevent it from being deleted. If empty, it means that
     *                                       the {@link Actuator|`Actuator`} can be deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Actuator|`Actuator`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-actuators-name-delete-locks-get">`/device/actuators/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     */
    @Get<MixPositionInfoJSON>(
        'actuators/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getActuatorDeleteLocksRest!: (pathParams: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    /**
     * Gets all the conflicts that prevent an {@link Actuator|`Actuator`} from being deleted.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Actuator#name|`name`} of the actuator to check.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link Actuator|`Actuator`} and prevent it from being deleted. If empty, it means that
     *                                       the {@link Actuator|`Actuator`} can be deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if no {@link Actuator|`Actuator`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-actuators-name-delete-locks-get">`/device/actuators/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @apiProxy
     * @get
     */
    public async getActuatorDeleteLocks(pathParams: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getActuatorDeleteLocksRest(pathParams);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }

    /**
     * Move an {@link Actuator|`Actuator`} inside a different {@link Group|`Group`}, or take it out of any {@link Group|`Group`}.
     *
     * @param {ChangeParentChange} change - The object containing the property {@link ChangeParentChange#parent|`parent`} indicating the {@link Group#name|name} of the new
     *                                    {@link Group|parent} or `null` to remove the parent.
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Actuator#name|`name`} of the actuator to move.
     * @returns {Promise<void>}
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Actuator|`Actuator`} or destination {@link Group|`Group`} was found with the specified
     *                               names.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  the {@link Actuator|`Actuator`} cannot be moved to the requested {@link Group|`Group`}, because it
     *     would break dependencies inside the {@link Mix|mixes}.
     * @apiEndpoint <a href="../../rest/#operation-device-actuators-name-parent-patch">`/device/actuators/{name}/parent`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<ChangeParentChange, null>(
        '/actuators/:name/parent'
    )
    public changeActuatorParent!: (change: ChangeParentChange, pathParams: EntityPathParams) => Promise<void>;

    /**
     * Returns information about all the {@link Group|`Group`s} that cannot be parents for this {@link Actuator|`Actuator`}, because they would break
     * dependencies inside the {@link Mix|mixes}. For example, if an {@link Actuator|actuator}'s {@link Mix|`Mix`} references a parent {@link Group|group}'s
     * {@link Mix|`Mix`}, this parent must remain in the hierarchy, otherwise the {@link Actuator|`Actuator`}'s {@link Mix|mix} will not be able to reach it.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Actuator#name|`name`} of the actuator.
     * @returns {Promise<UnavailableParents>} The information about the {@link UnavailableParents|unavailable groups}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Actuator|`Actuator`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-actuators-name-unavailable-parents-get">`/device/actuators/{name}/unavailable-parents`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/actuators/:name/unavailable-parents",
         {
             result: UnavailableParents,
             resultIsArray: true
         })
    public getActuatorUnavailableParents!: (pathParams: EntityPathParams) => Promise<UnavailableParents>;

    /**
     * Get all {@link Sensor|`Sensor`s} in the system, optionally filtered by {@link Mix|`Mix`}.
     *
     * @param {GetDevicesOptions} options - The options to filter the results.
     * @returns {Promise<Sensor[]>} An array containing the resulting {@link Sensor|`Sensor`s}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  both {@link GetDevicesOptions#mix|`mix`} and {@link GetDevicesOptions#anyMixed|`anyMixed`} are
     *     specified at the same time.
     * @apiEndpoint <a href="../../rest/#operation-device-sensors-get">`/device/sensors`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/sensors/",
        {
            result: Sensor,
            resultIsArray: true,
            queryParams: {
                mix: false
            }
        })
    public getSensors!: (options?: GetDevicesOptions) => Promise<Sensor[]>;

    /**
     * Creates a new device of type {@link Sensor|`Sensor`} in the system.
     *
     * @param {Sensor} sensor - The information about the {@link Sensor|`Sensor`} to be created.
     * @param {SensorCreateOptions} options - The additional optional info for the creation, namely the name of the {@link Group|`Group`} where the
     *                                     sensor will be placed.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  there already exist a {@link Sensor|sensor} with the same {@link Sensor#name|name}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  a {@link SensorCreateOptions#parent|parent} was specified but no {@link Group|`Group`} was found with
     *     the specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-sensors-post">`/device/sensors`</a>.
     * @group API Endpoints
     * @post
     */
    @Post<Sensor, null>(
        '/sensors/',
        {
            queryParams: {
                parent: false
            }
        }
    )
    public createSensor!: (sensor: Sensor, options?: SensorCreateOptions) => Promise<void>;

    /**
     * Get an {@link Sensor|`Sensor`} with a specific {@link Sensor#name|`name`}.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Sensor#name|`name`} of the sensor to retrieve.
     * @returns {Promise<Sensor>} - The {@link Sensor|`Sensor`}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Sensor|`Sensor`} was found with the
     *     specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-sensors-name-get">`/device/sensors/{name}`</a>.
     * @group API Endpoints
     * @get
     */
    @Get<Sensor>(
        '/sensors/:name',
        {
            result: Sensor
        }
    )
    public getSensorByName!: (pathParams: EntityPathParams) => Promise<Sensor>;

    /**
     * Edit a {@link Sensor|`Sensor`}'s properties, given its {@link Sensor#name|`name`}.
     *
     * @param {SensorEditChanges} changes - The {@link SensorEditChanges|properties} to be updated.
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Sensor#name|`name`} of the sensor to edit.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Sensor|`Sensor`} was found with the specified name.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  a new {@link Sensor#name|`name`} was specified, but a {@link Sensor|sensor} with that name already
     *     exists.
     * @returns {Promise<void>}
     * @apiEndpoint <a href="../../rest/#operation-device-sensors-name-patch">`/device/sensors/{name}`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<SensorEditChanges, null>(
        '/sensors/:name'
    )
    public editSensor!: (changes: SensorEditChanges, pathParams: EntityPathParams) => Promise<void>;


    /**
     * Removes a {@link Sensor|`Sensor`} from the system by its name, if possible.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Sensor#name|`name`} of the sensor to delete.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Sensor|`Sensor`} was found with the specified name.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  the {@link Sensor|`Sensor`} cannot be deleted because it is linked to a {@link Mix|mix} that is
     *     referenced in a {@link Mix|mix} downstream.
     * @returns {Promise<void>}
     * @apiEndpoint <a href="../../rest/#operation-device-sensors-name-delete">`/device/sensors/{name}`</a>.
     * @group API Endpoints
     * @delete
     */
    @Delete<null, null>(
        '/sensors/:name/'
    )
    public deleteSensor!: (pathParams: EntityPathParams) => Promise<void>;

    /**
     * Gets all the conflicts that prevent a {@link Sensor|`Sensor`} from being deleted.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Sensor#name|`name`} of the sensor to check.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link Sensor|`Sensor`} and prevent it from being deleted. If empty, it means that
     *                                       the {@link Sensor|`Sensor`} can be deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Sensor|`Sensor`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-sensors-name-delete-locks-get">`/device/sensors/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     */
    @Get<MixPositionInfoJSON>(
        'sensors/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getSensorDeleteLocksRest!: (pathParams: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    /**
     * Gets all the conflicts that prevent a {@link Sensor|`Sensor`} from being deleted.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Sensor#name|`name`} of the sensor to check.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link Sensor|`Sensor`} and prevent it from being deleted. If empty, it means that
     *                                       the {@link Sensor|`Sensor`} can be deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Sensor|`Sensor`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-sensors-name-delete-locks-get">`/device/sensors/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     * @apiProxy
     */
    public async getSensorDeleteLocks(pathParams: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getSensorDeleteLocksRest(pathParams);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }

    /**
     * Move a {@link Sensor|`Sensor`} inside a different {@link Group|`Group`}, or take it out of any {@link Group|`Group`}.
     *
     * @param {ChangeParentChange} change - The object containing the property {@link ChangeParentChange#parent|`parent`} indicating the {@link Group#name|name} of the new
     *                                    {@link Group|parent} or `null` to remove the parent.
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Sensor#name|`name`} of the sensor to check.
     * @returns {Promise<void>}
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Sensor|`Sensor`} or destination {@link Group|`Group`} was found with the specified
     *                               names.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  the {@link Sensor|`Sensor`} cannot be moved to the requested {@link Group|`Group`}, because it
     *                               would break dependencies in {@link Mix|`Mix`es} that depend on data related to the sensor or its linked mix.
     * @apiEndpoint <a href="../../rest/#operation-device-sensors-name-parent-patch">`/device/sensors/{name}/parent`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<ChangeParentChange, null>(
        '/sensors/:name/parent'
    )
    public changeSensorParent!: (change: ChangeParentChange, pathParams: EntityPathParams) => Promise<void>;

    /**
     * Returns information about all the {@link Group|`Group`s} that cannot be parents for this {@link Sensor|`Sensor`}, because they would break
     * dependencies inside the {@link Mix|mixes}. For example, if a {@link Sensor|sensor}'s {@link Mix|`Mix`} is referenced by a parent {@link Group|group}'s
     * {@link Mix|`Mix`}, this parent must remain in the hierarchy, otherwise the {@link Group|group}'s {@link Mix|mix} will not be able to reach it.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Sensor#name|`name`} of the sensor to check.
     * @returns {Promise<UnavailableParents>} The information about the {@link UnavailableParents|unavailable groups}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Sensor|`Sensor`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-sensors-name-unavailable-parents-get">`/device/sensors/{name}/unavailable-parents`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/sensors/:name/unavailable-parents",
        {
            result: UnavailableParents,
        })
    public getSensorUnavailableParents!: (pathParams: EntityPathParams) => Promise<UnavailableParents>;

    /**
     * Returns information about all the exposes that cannot be removed from this {@link Sensor|`Sensor`}, because they are referenced
     * in a {@link Mix|`Mix`} downstream.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Sensor#name|`name`} of the sensor to check.
     * @returns {Promise<LockedExposes[]>} The information about the {@link LockedExposes|locked exposes}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Sensor|`Sensor`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-device-sensors-name-locked-exposes-get">`/device/sensors/{name}/locked-exposes`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/sensors/:name/locked-exposes",
         {
             result: LockedExposes,
             resultIsArray: true,
         })
    public getLockedSensorExposes!: (pathParams: EntityPathParams) => Promise<LockedExposes[]>;
}

