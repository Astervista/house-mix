import {Component, model} from '@angular/core';
import {DevicesService} from './devices.service';
import {Actuator} from '@common/devices/actuator/actuator';
import {LoadingStatus} from '../../../utils/enums';
import {LoadingScrimComponent} from '../../auxiliary/loading-scrim/loading-scrim.component';
import {DeviceComponent} from '../../entities/device/device.component';
import {provideNativeDateAdapter} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatCardModule} from '@angular/material/card';

@Component({
               selector:    'house-mix-devices',
               imports: [MatCardModule, MatDatepickerModule, DeviceComponent, LoadingScrimComponent],
               templateUrl: './devices.component.html',
               providers:   [provideNativeDateAdapter()],
               styleUrl:    './devices.component.scss'
           })
export class DevicesComponent {

    protected actuators: Actuator[] | null = null;

    protected loadingStatus: LoadingStatus = LoadingStatus.LOADING;

    selected = model<Date | null>(null);

    constructor(private devicesService: DevicesService) {
        devicesService
            .getActuators()
            .then((actuators: Actuator[]) => {
                this.actuators     = actuators;
                this.loadingStatus = LoadingStatus.LOADED;
            })
            .catch((err: unknown) => {
                console.log(err);
                this.loadingStatus = LoadingStatus.ERROR;
            });
    }

}
