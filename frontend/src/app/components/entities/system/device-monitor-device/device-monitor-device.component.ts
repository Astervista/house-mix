import {Component, HostBinding, Input} from '@angular/core';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';
import {SYSTEM_TIMER_TYPE_DISPLAY} from '../../../system/constants';
import {MatIcon} from '@angular/material/icon';

@Component({
               selector:    'house-mix-device-monitor-device',
               imports:     [
                   MatIcon
               ],
               templateUrl: './device-monitor-device.component.html',
               styleUrl:    './device-monitor-device.component.scss'
           })
export class DeviceMonitorDeviceComponent {

    @Input({required: true}) public device!: DeviceMonitorDevice;

    @HostBinding('class.selected')
    @Input() public selected: boolean = false;

    protected readonly TOOLTIP_TIMEOUT           = TOOLTIP_TIMEOUT;
    protected readonly SYSTEM_TIMER_TYPE_DISPLAY = SYSTEM_TIMER_TYPE_DISPLAY;
}
