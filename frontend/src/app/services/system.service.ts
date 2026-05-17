/**
 * This module contains the {@link SystemService|`SystemService`}.
 *
 * @module
 */
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BasePath, Delete, Get, Patch, Post, Put} from '../utils/networking/decorators';
import {SystemParameter} from '@common/system/parameter/system-parameter';
import {SystemSettings, SystemSettingsJSON} from '@common/system/settings/settings';
import {SystemTimer} from '@common/system/timer/system-timer';
import {EntityPathParams} from '@common/utils/rest-classes';
import {SetParameterBody} from '@common/system/parameter/rest-classes';
import {mixInfoFromJSON, MixPositionInfo, MixPositionInfoJSON} from '@common/mixing/mix/rest-classes';
import {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';
import {Adjustment} from '@common/system/adjustment/adjustment';
import {Observable, Subject} from 'rxjs';

// noinspection ES6UnusedImports
import type {DatumType} from '@common/mixing/mix/datum';
// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';
// noinspection ES6UnusedImports
import type {HttpErrorResponse} from '@angular/common/http';

/**
 * A class containing the {@link Adjustment#id|`id`} of an {@link Adjustment|`Adjustment`}.
 */
export interface AdjustmentPathParams {
    /** The {@link Adjustment#id|`id`}. */
    id: number
}

/**
 * This is the service that handles all REST requests to the `"/system/*"` endpoints regarding
 * system configuration and customization.
 */
@Injectable({
                providedIn: 'root'
            })
@BasePath('/system')
export class SystemService {

    /**
     * Creates an instance of the service. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {HttpClient} httpClient - - The http service. Instantiated by dependency injection.
     */
    constructor(private httpClient: HttpClient) { }

    // PARAMETERS

    /**
     * Get all {@link SystemParameter|`SystemParameter`s} in the system.
     *
     * @returns {Promise<SystemParameter[]>} An array containing the resulting {@link SystemParameter|`SystemParameter`s}.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-get">`/system/parameters`</a>.
     * @group API Endpoints
     * @get
     */
    @Get("/parameters/", { result: SystemParameter, resultIsArray: true })
    public getParameters!: () => Promise<SystemParameter[]>;

    /**
     * Adds a new {@link SystemParameter|`SystemParameter`} to the system.
     *
     * @param {SystemParameter} parameter - The {@link SystemParameter|`SystemParameter`} to create.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  a parameter with the same name already exists.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-post">`/system/parameters`</a>.
     * @group API Endpoints
     * @post
     */
    @Post<SystemParameter, null>(
        '/parameters/'
    )
    public createParameter!: (parameter: SystemParameter) => Promise<void>;

    /**
     * Removes a {@link SystemParameter|`SystemParameter`} from the system by its name.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link SystemParameter#name|`name`} of the parameter to remove.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  the parameter is used in a mix.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-name-delete">`/system/parameters/{name}`</a>.
     * @group API Endpoints
     * @delete
     */
    @Delete<null, null>(
        '/parameters/:name/'
    )
    public deleteParameter!: (pathParams: EntityPathParams) => Promise<void>;

    /**
     * Sets the value of a {@link SystemParameter|`SystemParameter`}.
     *
     * @param {SetParameterBody} value - The new value.
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link SystemParameter#name|`name`} of the parameter.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  the provided value is not valid for the chosen parameter.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-name-value-patch">`/system/parameters/{name}/value`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<SetParameterBody, null>(
        '/parameters/:name/value'
    )
    public setParameterValue!: (value: SetParameterBody, pathParams: EntityPathParams) => Promise<void>;

    /**
     * Gets the value of a {@link SystemParameter|`SystemParameter`}.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link SystemParameter#name|`name`} of the parameter.
     * @returns {Promise<SetParameterBody>} An object containing the current value of the parameter.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-name-value-get">`/system/parameters/{name}/value`</a>.
     * @see {@link DatumType|`DatumType`} for a description of the return types.
     * @group API Endpoints
     * @get
     */
    @Get<SetParameterBody>(
        '/parameters/:name/value',
        {
            result: SetParameterBody
        }
    )
    public getParameterValue!: (pathParams: EntityPathParams) => Promise<SetParameterBody>;

    /**
     * Gets all the conflicts that prevent a {@link SystemParameter|`SystemParameter`} from being deleted.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link SystemParameter#name|`name`} of the parameter.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link SystemParameter|`SystemParameter`} and prevent it from being deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-name-delete-locks-get">`/system/parameters/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     */
    @Get<MixPositionInfoJSON>(
        'parameters/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getParameterDeleteLocksRest!: (pathParams: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    /**
     * Gets all the conflicts that prevent a {@link SystemParameter|`SystemParameter`} from being deleted.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link SystemParameter#name|`name`} of the parameter.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link SystemParameter|`SystemParameter`} and prevent it from being deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-parameters-name-delete-locks-get">`/system/parameters/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     * @apiProxy
     */
    public async getParameterDeleteLocks(pathParams: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getParameterDeleteLocksRest(pathParams);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }


    // TIMERS


    /**
     * Get all {@link SystemTimer|`SystemTimer`s} in the system.
     *
     * @returns {Promise<SystemTimer[]>} An array containing the resulting {@link SystemTimer|`SystemTimer`s}.
     * @apiEndpoint <a href="../../rest/#operation-system-timers-get">`/system/timers`</a>.
     * @group API Endpoints
     * @get
     */
    @Get(
        "/timers/",
        {
            result: SystemTimer,
            resultIsArray: true
        }
    )
    public getTimers!: () => Promise<SystemTimer[]>;

    /**
     * Adds a new {@link SystemTimer|`SystemTimer`} to the system.
     *
     * @param {SystemTimer} timer - The {@link SystemTimer|`SystemTimer`} to add.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  the timer's {@link SystemTimer#occurrence|`occurrence`} is out of range for the chosen
     *     {@link SystemTimer#type|`type`}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  a timer with the same name already exists.
     * @apiEndpoint <a href="../../rest/#operation-system-timers-post">`/system/timers`</a>.
     * @group API Endpoints
     * @post
     */
    @Post<SystemTimer, null>(
        '/timers/'
    )
    public createTimer!: (timer: SystemTimer) => Promise<void>;

    /**
     * Updates an existing {@link SystemTimer|`SystemTimer`}.
     *
     * @param {SystemTimer} changes - The updated {@link SystemTimer|`SystemTimer`}.
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link SystemTimer#name|`name`} of the timer to update.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link SystemTimer|`SystemTimer`} was found with the specific name.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  the occurrence is invalid or if the name in the body doesn't match the path.
     * @apiEndpoint <a href="../../rest/#operation-system-timers-name-patch">`/system/timers/{name}`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<SystemTimer, null>(
        '/timers/:name'
    )
    public editTimer!: (changes: SystemTimer, pathParams: EntityPathParams) => Promise<void>;

    /**
     * Removes a {@link SystemTimer|`SystemTimer`} from the system by its name.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link SystemTimer#name|`name`} of the timer to remove.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  the timer is used in a mix.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link SystemTimer|`SystemTimer`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-timers-name-delete">`/system/timers/{name}`</a>.
     * @group API Endpoints
     * @delete
     */
    @Delete<null, null>(
        '/timers/:name/'
    )
    public deleteTimer!: (pathParams: EntityPathParams) => Promise<void>;

    /**
     * Gets all the conflicts that prevent a {@link SystemTimer|`SystemTimer`} from being deleted.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link SystemTimer#name|`name`} of the timer to check.
     * @returns {Promise<MixPositionInfoJSON[]>} A list of serialized {@link MixPositionInfo|positions} of all the mixes that
     *                                       reference the {@link SystemTimer|`SystemTimer`} and prevent it from being deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link SystemTimer|`SystemTimer`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-timers-name-delete-locks-get">`/system/timers/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     */
    @Get<MixPositionInfoJSON>(
        'timers/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getTimerDeleteLocksRest!: (pathParams: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    /**
     * Gets all the conflicts that prevent a {@link SystemTimer|`SystemTimer`} from being deleted.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link SystemTimer#name|`name`} of the timer to check.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the mixes that
     *                                       reference the {@link SystemTimer|`SystemTimer`} and prevent it from being deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link SystemTimer|`SystemTimer`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-timers-name-delete-locks-get">`/system/timers/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     * @apiProxy
     */
    public async getTimerDeleteLocks(pathParams: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getTimerDeleteLocksRest(pathParams);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }


    // DEVICE MONITOR


    /**
     * Get all {@link DeviceMonitorDevice|`DeviceMonitorDevice`s} in the system.
     *
     * @returns {Promise<DeviceMonitorDevice[]>} An array containing the resulting {@link DeviceMonitorDevice|`DeviceMonitorDevice`s}.
     * @apiEndpoint <a href="../../rest/#operation-system-device-monitor-get">`/system/device-monitor`</a>.
     * @group API Endpoints
     * @get
     */
    @Get('/device-monitor/', {result: DeviceMonitorDevice, resultIsArray: true})
    public getDeviceMonitorDevices!: () => Promise<DeviceMonitorDevice[]>;

    /**
     * Adds a new {@link DeviceMonitorDevice|`DeviceMonitorDevice`} to the system.
     *
     * @param {DeviceMonitorDevice} deviceMonitorDevice - The {@link DeviceMonitorDevice|DeviceMonitorDevice} to add.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  a device with the same name already exists.
     * @apiEndpoint <a href="../../rest/#operation-system-device-monitor-post">`/system/device-monitor`</a>.
     * @group API Endpoints
     * @post
     */
    @Post<SystemTimer, null>(
        '/device-monitor/'
    )
    public createDeviceMonitorDevice!: (deviceMonitorDevice: DeviceMonitorDevice) => Promise<void>;

    /**
     * Removes a {@link DeviceMonitorDevice|`DeviceMonitorDevice`} from the system by its name.
     *
     * @param {EntityPathParams} pathParameters - The HTTP request's path parameters with the {@link DeviceMonitorDevice#name|`name`} of the device to remove.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  the device is used in a mix.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link DeviceMonitorDevice|`DeviceMonitorDevice`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-device-monitor-name-delete">`/system/device-monitor/{name}`</a>.
     * @group API Endpoints
     * @delete
     */
    @Delete<null, null>(
        '/device-monitor/:name/'
    )
    public deleteDeviceMonitorDevice!: (pathParameters: EntityPathParams) => Promise<void>;

    /**
     * Edit a {@link DeviceMonitorDevice|`DeviceMonitorDevice`}'s properties, given its {@link DeviceMonitorDevice#name|`name`}.
     * This call cannot change the name of the device, to achieve this delete and recreate the device.
     *
     * @param {DeviceMonitorDevice} changes - The new {@link DeviceMonitorDevice|`DeviceMonitorDevice`} value to be updated.
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link DeviceMonitorDevice#name|`name`} of the device to edit.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  there is an attempt to change the {@link DeviceMonitorDevice#name|`name`}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link DeviceMonitorDevice|`DeviceMonitorDevice`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-device-monitor-name-patch">`/system/device-monitor/{name}`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<DeviceMonitorDevice, null>(
        '/device-monitor/:name'
    )
    public editDeviceMonitorDevice!: (changes: DeviceMonitorDevice, pathParams: EntityPathParams) => Promise<void>;

    /**
     * Gets all the conflicts that prevent a {@link DeviceMonitorDevice|`DeviceMonitorDevice`} from being deleted.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link DeviceMonitorDevice#name|`name`} of the device to edit.
     * @returns {Promise<MixPositionInfoJSON[]>}  A list of {@link MixPositionInfo|positions}'s serializations of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link DeviceMonitorDevice|`DeviceMonitorDevice`} and prevent it from being deleted. If empty,
     *                                       it means that the {@link DeviceMonitorDevice|`DeviceMonitorDevice`} can be deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link DeviceMonitorDevice|`DeviceMonitorDevice`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-device-monitor-name-delete-locks-get">`/system/device-monitor/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     */
    @Get<MixPositionInfoJSON>(
        'device-monitor/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getDeviceMonitorDeviceDeleteLocksRest!: (pathParams: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    /**
     * Gets all the conflicts that prevent a {@link DeviceMonitorDevice|`DeviceMonitorDevice`} from being deleted.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link DeviceMonitorDevice#name|`name`} of the device to edit.
     * @returns {Promise<MixPositionInfoJSON[]>}  A list of {@link MixPositionInfo|positions}'s serializations of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link DeviceMonitorDevice|`DeviceMonitorDevice`} and prevent it from being deleted. If empty,
     *                                       it means that the {@link DeviceMonitorDevice|`DeviceMonitorDevice`} can be deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link DeviceMonitorDevice|`DeviceMonitorDevice`} was found with the specific name.
     * @apiEndpoint <a href="../../rest/#operation-system-device-monitor-name-delete-locks-get">`/system/device-monitor/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     * @apiProxy
     */
    public async getDeviceMonitorDeviceDeleteLocks(pathParams: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getDeviceMonitorDeviceDeleteLocksRest(pathParams);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }


    // ADJUSTMENTS


    /**
     * Get all {@link Adjustment|`Adjustment`s} in the system.
     *
     * @returns {Promise<Adjustment<unknown>[]>} An array containing the resulting {@link Adjustment|`Adjustment`s}.
     * @apiEndpoint <a href="../../rest/#operation-system-adjustments-get">`/system/adjustments`</a>.
     * @group API Endpoints
     * @get
     */
    @Get(
        '/adjustments/',
        {
            result: Adjustment<unknown, unknown>,
            resultIsArray: true
        }
    )
    public getAdjustments!: () => Promise<Adjustment<unknown, unknown>[]>;

    /**
     * Creates a new {@link Adjustment|`Adjustment`} in the system.
     *
     * @param {Adjustment<unknown>} adjustment - The {@link Adjustment|`Adjustment`} to be created.
     * @returns {Promise<AdjustmentPathParams>} The ID of the newly created adjustment, assigned by the system.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  the adjustment value provided is not valid, or if
     *                                 the new {@link Adjustment#id|`adjustment id`} is not `"NEW"`.
     * @apiEndpoint <a href="../../rest/#operation-system-adjustments-put">`/system/adjustments`</a>.
     * @group API Endpoints
     * @put
     */
    @Put<Adjustment<unknown, unknown>, AdjustmentPathParams>(
        '/adjustments/'
    )
    public createAdjustment!: (adjustment: Adjustment<unknown, unknown>) => Promise<AdjustmentPathParams>;

    /**
     * Edit an {@link Adjustment|`Adjustment`}'s properties, given its {@link Adjustment#id|`id`}.
     * This call cannot change an {@link Adjustment#type|adjustment's `type`},
     * delete and recreate the adjustment to change it.
     *
     * @param {Adjustment<unknown>} changes - The HTTP request's body containing the properties to be updated.
     * @param {AdjustmentPathParams} pathParams - The HTTP request's path parameters with the {@link Adjustment#id|`id`} of the adjustment to edit.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  the data is invalid or if there
     *                                  is an attempt to change the {@link Adjustment#id|`id`} or the {@link Adjustment#type|`type`}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Adjustment|`Adjustment`} with the specified ID exists.
     * @apiEndpoint <a href="../../rest/#operation-system-adjustments-id-patch">`/system/adjustments/{id}`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<Adjustment<unknown, unknown>, null>(
        '/adjustments/:id'
    )
    public editAdjustment!: (changes: Adjustment<unknown, unknown>, pathParams: AdjustmentPathParams) => Promise<void>;

    /**
     * Removes an {@link Adjustment|`Adjustment`} from the system by its ID.
     *
     * @param {AdjustmentPathParams} pathParams - The HTTP request's path parameters with the {@link Adjustment#id|`id`} of the adjustment to delete.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Adjustment|`Adjustment`} with the specified ID exists.
     * @apiEndpoint <a href="../../rest/#operation-system-adjustments-id-delete">`/system/adjustments/{id}`</a>.
     * @group API Endpoints
     * @delete
     */
    @Delete<null, null>(
        '/adjustments/:id/'
    )
    public deleteAdjustment!: (pathParams: AdjustmentPathParams) => Promise<void>;


    // SETTINGS

    /** The {@link Subject|`Subject`} where to publish new settings when they change. */
    private settingsChangeSubject: Subject<SystemSettings> = new Subject<SystemSettings>();

    /**
     * Get the current {@link SystemSettings|`SystemSettings`} of the system.
     *
     * @returns {Promise<SystemSettings>} The resulting {@link SystemSettings|`SystemSettings`}.
     * @apiEndpoint <a href="../../rest/#operation-system-settings-get">`/system/settings`</a>.
     * @group API Endpoints
     * @get
     */
    @Get('/settings/', {result: SystemSettings})
    public getSettings!: () => Promise<SystemSettings>;

    /**
     * Updates the {@link SystemSettings|`SystemSettings`} of the system.
     *
     * @param {SystemSettingsJSON} changes - The {@link SystemSettingsJSON|serialization} of the settings to update.
     * @returns {Promise<SystemSettings>} The updated {@link SystemSettings|`SystemSettings`}.
     * @apiEndpoint <a href="../../rest/#operation-system-settings-patch">`/system/settings`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<SystemSettings, null>('/settings')
    private editSettingsREST!: (changes: SystemSettingsJSON) => Promise<SystemSettings>;

    /**
     * Updates the {@link SystemSettings|`SystemSettings`} of the system, and notifies observers.
     *
     * @param {SystemSettingsJSON} changes - The {@link SystemSettingsJSON|serialization} of the settings to update.
     * @returns {Promise<SystemSettings>} The updated {@link SystemSettings|`SystemSettings`}.
     * @apiEndpoint <a href="../../rest/#operation-system-settings-patch">`/system/settings`</a>.
     * @group API Endpoints
     * @patch
     * @apiProxy
     */
    public async editSettings(changes: SystemSettingsJSON): Promise<SystemSettings> {
        const newSettings = await this.editSettingsREST(changes);
        this.settingsChangeSubject.next(newSettings);
        return newSettings;
    }

    /**
     * Observe changes on {@link SystemSettings|`SystemSettings`}.
     *
     * @returns {Observable<SystemSettings>} - The {@link Observable|`Observable`} that will be updated every time the settings are changed.
     */
    public observeSettingsChanges(): Observable<SystemSettings> {
        return this.settingsChangeSubject.asObservable();
    }

}
