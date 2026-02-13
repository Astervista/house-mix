import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BasePath, Delete, Get, Patch, Post} from '../utils/networking/decorators';
import { SystemParameter } from "@common/system/parameter/system-parameter";
import { SystemTimer } from "@common/system/timer/system-timer";
import { EntityPathParams } from "@common/utils/rest-classes";
import { SetParameterBody } from "@common/system/parameter/rest-classes";
import {mixInfoFromJSON, MixPositionInfo, MixPositionInfoJSON} from '@common/mixing/mix/rest-classes';
import {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';

@Injectable({
                providedIn: 'root'
            })
@BasePath('/system')
export class SystemService {

    constructor(private httpClient: HttpClient) { }

    // PARAMETERS

    @Get("/parameters/", { result: SystemParameter, resultIsArray: true })
    public getParameters!: () => Promise<SystemParameter[]>;

    @Post<SystemParameter, null>(
        '/parameters/'
    )
    public createParameter!: (parameter: SystemParameter) => Promise<void>;

    @Delete<null, null>(
        '/parameters/:name/'
    )
    public deleteParameter!: (params: EntityPathParams) => Promise<void>;

    @Patch<SetParameterBody, null>(
        '/parameters/:name/value'
    )
    public setParameterValue!: (value: SetParameterBody, params: EntityPathParams) => Promise<void>;

    @Get<MixPositionInfoJSON>(
        'parameters/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getParameterDeleteLocksRest!: (params: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    public async getParameterDeleteLocks(params: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getParameterDeleteLocksRest(params);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }


    // TIMERS


    @Get("/timers/", { result: SystemTimer, resultIsArray: true })
    public getTimers!: () => Promise<SystemTimer[]>;

    @Post<SystemTimer, null>(
        '/timers/'
    )
    public createTimer!: (timer: SystemTimer) => Promise<void>;

    @Delete<null, null>(
        '/timers/:name/'
    )
    public deleteTimer!: (params: EntityPathParams) => Promise<void>;

    @Patch<SystemTimer, null>(
        '/timers/:name'
    )
    public editTimer!: (changes: SystemTimer, params: EntityPathParams) => Promise<void>;

    @Get<MixPositionInfoJSON>(
        'timers/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getTimerDeleteLocksRest!: (params: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    public async getTimerDeleteLocks(params: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getTimerDeleteLocksRest(params);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }


    // DEVICE MONITOR


    @Get('/device-monitor/', {result: DeviceMonitorDevice, resultIsArray: true})
    public getDeviceMonitorDevices!: () => Promise<DeviceMonitorDevice[]>;

    @Post<SystemTimer, null>(
        '/device-monitor/'
    )
    public createDeviceMonitorDevice!: (deviceMonitorDevice: DeviceMonitorDevice) => Promise<void>;

    @Delete<null, null>(
        '/device-monitor/:name/'
    )
    public deleteDeviceMonitorDevice!: (params: EntityPathParams) => Promise<void>;

    @Patch<DeviceMonitorDevice, null>(
        '/device-monitor/:name'
    )
    public editDeviceMonitorDevice!: (changes: DeviceMonitorDevice, params: EntityPathParams) => Promise<void>;

    @Get<MixPositionInfoJSON>(
        'device-monitor/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getDeviceMonitorDeviceDeleteLocksRest!: (params: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    public async getDeviceMonitorDeviceDeleteLocks(params: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getDeviceMonitorDeviceDeleteLocksRest(params);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }
}
