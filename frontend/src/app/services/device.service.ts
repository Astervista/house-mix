import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Actuator } from '@common/devices/actuator/actuator';
import {BasePath, Get} from '../utils/networking/decorators';

@Injectable({
    providedIn: 'root'
})
@BasePath("/device")
export class DeviceService {

    constructor(private httpClient: HttpClient) { }

    @Get("/actuator/all", { result: Actuator, resultIsArray: true })
    public getActuators!: () => Promise<Actuator[]>;

}

