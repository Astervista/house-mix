import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Actuator } from '@common/devices/actuator/actuator';
import { Sensor } from '@common/devices/sensor/sensor';
import { ActuatorCreateOptions, ActuatorEditChanges } from '@common/devices/actuator/rest-classes';
import { SensorCreateOptions, SensorEditChanges } from '@common/devices/sensor/rest-classes';
import {BasePath, Delete, Get, Patch, Post} from '../utils/networking/decorators';
import {ChangeParentChange} from '@common/devices/group/rest-classes';
import { GetDevicesOptions } from "@common/devices/rest-classes";
import { EntityPathParams } from "@common/utils/rest-classes";

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

    @Patch<ChangeParentChange, null>(
        '/actuators/:name/parent'
    )
    public changeActuatorParent!: (change: ChangeParentChange, params: EntityPathParams) => Promise<void>;

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

    @Patch<ChangeParentChange, null>(
        '/sensors/:name/parent'
    )
    public changeSensorParent!: (change: ChangeParentChange, params: EntityPathParams) => Promise<void>;

}

