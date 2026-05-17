/**
 *  This module contains the {@link DeviceMonitorDeviceComponent|`DeviceMonitorDeviceComponent`} and related classes.
 *
 *  @module
 */
import {Component, HostBinding, Input} from '@angular/core';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';
import {SYSTEM_TIMER_TYPE_DISPLAY} from '../../../system/constants';
import {MatIcon} from '@angular/material/icon';

/**
 * A component that can display a {@link DeviceMonitorDevice|`DeviceMonitorDevice`}.
 *
 * @component
 * @componentSelector `<house-mix-device-monitor-device>`
 */
@Component({
               selector:    'house-mix-device-monitor-device',
               imports:     [
                   MatIcon
               ],
               templateUrl: './device-monitor-device.component.html',
               styleUrl:    './device-monitor-device.component.scss'
           })
export class DeviceMonitorDeviceComponent {

    /**
     * The {@link DeviceMonitorDevice|`DeviceMonitorDevice`} to display.
     *
     * @input
     * @required
     */
    @Input({required: true}) public device!: DeviceMonitorDevice;


    /**
     * Whether the component is selected. A selected component shows a colored outline on the element.
     *
     * @input
     * @hostBinding class.selected
     */
    @HostBinding('class.selected')
    @Input() public selected: boolean = false;

    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT           = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly SYSTEM_TIMER_TYPE_DISPLAY = SYSTEM_TIMER_TYPE_DISPLAY;
}
