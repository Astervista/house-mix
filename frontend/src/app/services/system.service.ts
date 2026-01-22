import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BasePath, Delete, Get, Post} from '../utils/networking/decorators';
import { EntityPathParams } from "@common/devices/group/rest-classes";
import { SystemParameter } from "@common/system/parameter/system-parameter";
import { SystemTimer } from "@common/system/timer/system-timer";

@Injectable({
                providedIn: 'root'
            })
@BasePath('/system')
export class SystemService {

    constructor(private httpClient: HttpClient) { }

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

}
