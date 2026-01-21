import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Actuator } from '@common/devices/actuator/actuator';
import { Sensor } from '@common/devices/sensor/sensor';
import { ActuatorCreateOptions, ActuatorEditChanges } from '@common/devices/actuator/rest-classes';
import { SensorCreateOptions, SensorEditChanges } from '@common/devices/sensor/rest-classes';
import {BasePath, Delete, Get, Patch, Post} from '../utils/networking/decorators';
import {ChangeParentChange, EntityPathParams} from '@common/devices/group/rest-classes';

@Injectable({
    providedIn: 'root'
})
@BasePath("/device")
export class DeviceService {

    constructor(private httpClient: HttpClient) { }

    @Get("/actuator/", { result: Actuator, resultIsArray: true })
    public getActuators!: () => Promise<Actuator[]>;

    @Post<Actuator, null>(
        '/actuator/',
        {
            queryParams: {
                parent: false
            }
        }
    )
    public createActuator!: (group: Actuator, options?: ActuatorCreateOptions) => Promise<void>;

    @Patch<ActuatorEditChanges, null>(
        '/actuator/:name'
    )
    public editActuator!: (changes: ActuatorEditChanges, params: EntityPathParams) => Promise<void>;

    @Delete<null, null>(
        '/actuator/:name/'
    )
    public deleteActuator!: (params: EntityPathParams) => Promise<void>;

    @Patch<ChangeParentChange, null>(
        '/actuator/:name/parent'
    )
    public changeActuatorParent!: (change: ChangeParentChange, params: EntityPathParams) => Promise<void>;

    @Get("/sensor/", { result: Sensor, resultIsArray: true })
    public getSensors!: () => Promise<Sensor[]>;

    @Post<Sensor, null>(
        '/sensor/',
        {
            queryParams: {
                parent: false
            }
        }
    )
    public createSensor!: (group: Sensor, options?: SensorCreateOptions) => Promise<void>;

    @Patch<SensorEditChanges, null>(
        '/sensor/:name'
    )
    public editSensor!: (changes: SensorEditChanges, params: EntityPathParams) => Promise<void>;

    @Delete<null, null>(
        '/sensor/:name/'
    )
    public deleteSensor!: (params: EntityPathParams) => Promise<void>;

    @Patch<ChangeParentChange, null>(
        '/sensor/:name/parent'
    )
    public changeSensorParent!: (change: ChangeParentChange, params: EntityPathParams) => Promise<void>;

}

