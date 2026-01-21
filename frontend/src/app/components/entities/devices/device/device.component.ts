import {Component, EventEmitter, HostBinding, HostListener, Input, Output} from '@angular/core';
import {Device} from '@common/devices/device';
import {Actuator} from '@common/devices/actuator/actuator';
import {Sensor} from '@common/devices/sensor/sensor';
import {MatIcon} from '@angular/material/icon';
import {ACTUATOR_TYPE_DISPLAY, ACTUATOR_TYPE_ICON, SENSOR_TYPE_DISPLAY, SENSOR_TYPE_ICON} from './constants';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {MatTooltip} from '@angular/material/tooltip';
import {DynamicSvgComponent} from '../../../auxiliary/dynamic-svg/dynamic-svg.component';

@Component({
               selector:    'house-mix-device',
               templateUrl: './device.component.html',
               imports: [
                   MatIcon,
                   MatTooltip,
                   DynamicSvgComponent
               ],
               styleUrl:    './device.component.scss'
           })
export class DeviceComponent {

    @Input({required: true}) public device!: Device;
    @HostBinding("class.selected")
    @Input() public selected: boolean = false;

    @Output("onSelect") public onSelectEmitter: EventEmitter<Device> = new EventEmitter<Device>();

    @HostListener('click', ["$event"])
    public onClick(event: MouseEvent): void {
        event.stopPropagation();
        this.onSelectEmitter.emit(this.device);
    }

    constructor(
    ) {}

    public isActuator(device: Device = this.device): device is Actuator {
        return device instanceof Actuator;
    }

    public isSensor(device: Device = this.device): device is Sensor {
        return device instanceof Sensor;
    }

    protected readonly ACTUATOR_TYPE_ICON = ACTUATOR_TYPE_ICON;
    protected readonly TOOLTIP_TIMEOUT       = TOOLTIP_TIMEOUT;
    protected readonly ACTUATOR_TYPE_DISPLAY = ACTUATOR_TYPE_DISPLAY;
    protected readonly SENSOR_TYPE_ICON    = SENSOR_TYPE_ICON;
    protected readonly SENSOR_TYPE_DISPLAY = SENSOR_TYPE_DISPLAY;
}
