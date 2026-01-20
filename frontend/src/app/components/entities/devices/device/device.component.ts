import {Component, Input} from '@angular/core';
import {Device} from '@common/devices/device';
import {Actuator} from '@common/devices/actuator/actuator';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {Router} from '@angular/router';

@Component({
               selector:    'house-mix-device',
               templateUrl: './device.component.html',
               imports: [
                   MatIconButton,
                   MatIcon
               ],
               styleUrl:    './device.component.scss'
           })
export class DeviceComponent {

    @Input({required: true}) public device!: Device;

    constructor(
        private router: Router
    ) {}

    public isActuator(device: Device = this.device): device is Actuator {
        return this.device instanceof Actuator;
    }

    public isSensor(device: Device = this.device): boolean {
        return false;
    }

    protected openMix(): void {
        if (this.isActuator(this.device)) {
            // Navigate to mix page, with query parameter id
            void this.router.navigate(['mix'], {queryParams: {id: this.device.mix}});
        }
    }
}
