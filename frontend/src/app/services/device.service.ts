import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Actuator } from '@common/devices/actuator/actuator';
import { Sensor } from '@common/devices/sensor/sensor';
import { ActuatorCreateOptions, ActuatorEditChanges } from '@common/devices/actuator/rest-classes';
import { SensorCreateOptions, SensorEditChanges } from '@common/devices/sensor/rest-classes';
import {BasePath, Delete, Get, Patch, Post} from '../utils/networking/decorators';
import {ChangeParentChange} from '@common/devices/group/rest-classes';
import { GetDevicesOptions, LockedExposes, UnavailableParents } from "@common/devices/rest-classes";
import { EntityPathParams } from "@common/utils/rest-classes";
import {mixInfoFromJSON, MixPositionInfo, MixPositionInfoJSON} from '@common/mixing/mix/rest-classes';

@Injectable({
    providedIn: 'root'
})
@BasePath("/device")
export class DeviceService {

    constructor(private httpClient: HttpClient) { }

    @Get(
        "/actuators/",
        {
            result: Actuator,
            resultIsArray: true,
            queryParams: {
                mix: false
            }
        })
    public getActuators!: (options?: GetDevicesOptions) => Promise<Actuator[]>;

    @Post<Actuator, null>(
        '/actuators/',
        {
            queryParams: {
                parent: false
            }
        }
    )
    public createActuator!: (actuator: Actuator, options?: ActuatorCreateOptions) => Promise<void>;

    @Get<Actuator>(
        '/actuators/:name',
        {
            result: Actuator
        }
    )
    public getActuatorByName!: (pathParams: { name: string }) => Promise<Actuator>;

    @Patch<ActuatorEditChanges, null>(
        '/actuators/:name'
    )
    public editActuator!: (changes: ActuatorEditChanges, params: EntityPathParams) => Promise<void>;

    @Delete<null, null>(
        '/actuators/:name/'
    )
    public deleteActuator!: (params: EntityPathParams) => Promise<void>;

    @Get<MixPositionInfoJSON>(
        'actuators/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getActuatorDeleteLocksRest!: (params: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    public async getActuatorDeleteLocks(params: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getActuatorDeleteLocksRest(params);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }

    @Patch<ChangeParentChange, null>(
        '/actuators/:name/parent'
    )
    public changeActuatorParent!: (change: ChangeParentChange, params: EntityPathParams) => Promise<void>;

    @Get("/actuators/:name/unavailable-parents",
         {
             result: UnavailableParents,
             resultIsArray: true
         })
    public getActuatorUnavailableParents!: (params: EntityPathParams) => Promise<UnavailableParents>;

    @Get("/sensors/",
        {
            result: Sensor,
            resultIsArray: true,
            queryParams: {
                mix: false
            }
        })
    public getSensors!: (options?: GetDevicesOptions) => Promise<Sensor[]>;

    @Post<Sensor, null>(
        '/sensors/',
        {
            queryParams: {
                parent: false
            }
        }
    )
    public createSensor!: (group: Sensor, options?: SensorCreateOptions) => Promise<void>;

    @Patch<SensorEditChanges, null>(
        '/sensors/:name'
    )
    public editSensor!: (changes: SensorEditChanges, params: EntityPathParams) => Promise<void>;

    @Delete<null, null>(
        '/sensors/:name/'
    )
    public deleteSensor!: (params: EntityPathParams) => Promise<void>;

    @Get<MixPositionInfoJSON>(
        'sensors/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getSensorDeleteLocksRest!: (params: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    public async getSensorDeleteLocks(params: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getSensorDeleteLocksRest(params);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }

    @Patch<ChangeParentChange, null>(
        '/sensors/:name/parent'
    )
    public changeSensorParent!: (change: ChangeParentChange, params: EntityPathParams) => Promise<void>;

    @Get("/sensors/:name/unavailable-parents",
        {
            result: UnavailableParents,
        })
    public getSensorUnavailableParents!: (params: EntityPathParams) => Promise<UnavailableParents>;


    @Get("/sensors/:name/locked-exposes",
         {
             result: LockedExposes,
             resultIsArray: true,
         })
    public getLockedSensorExposes!: (params: EntityPathParams) => Promise<LockedExposes[]>;
}

