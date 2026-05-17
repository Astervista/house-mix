/**
 *  This module contains the {@link DeviceComponent|`DeviceComponent`} and related classes.
 *
 *  @module
 */
import {Component, EventEmitter, HostBinding, HostListener, Input, Output} from '@angular/core';
import {Device} from '@common/devices/device';
import {Actuator} from '@common/devices/actuator/actuator';
import {Sensor} from '@common/devices/sensor/sensor';
import {MatIcon} from '@angular/material/icon';
import {ACTUATOR_TYPE_DISPLAY, ACTUATOR_TYPE_ICON, SENSOR_TYPE_DISPLAY, SENSOR_TYPE_ICON} from './constants';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {MatTooltip} from '@angular/material/tooltip';
import {DynamicSvgComponent} from '../../../auxiliary/dynamic-svg/dynamic-svg.component';

/**
 * A component that can display a {@link Device|`Device`}.
 *
 * @component
 * @componentSelector `<house-mix-device>`
 */
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

    /**
     * The device to display.
     *
     * @input
     * @required
     */
    @Input({required: true})
    public device!: Device;
    /**
     * Whether the component is selected. A selected component shows a colored outline on the element.
     *
     * @input
     * @hostBinding class.selected
     */
    @HostBinding("class.selected")
    @Input()
    public selected: boolean = false;
    /**
     * Whether the device is shown in full or compact view.
     * Compact view is for lists, full view shows a bigger icon.
     *
     * @input
     */
    @Input()
    public compact: boolean = false;

    /**
     * Gets triggered when the element is clicked. Emits the selected {@link Device|`Device`}.
     *
     * @output
     * @outputAlias onSelect
     */
    @Output("onSelect") public onSelectEmitter: EventEmitter<Device> = new EventEmitter<Device>();

    /**
     * Click handler for the element.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    @HostListener('click', ["$event"])
    public onClick(event: MouseEvent): void {
        event.stopPropagation();
        this.onSelectEmitter.emit(this.device);
    }

    /**
     * Tests if a {@link Device|`Device`}is an {@link Actuator|`Actuator`}.
     *
     * @param {Device} device - The device to check. Defaults to `this.device`.
     * @returns {device is Actuator} - Whether the device is an {@link Actuator|`Actuator`}.
     */
    public isActuator(device: Device = this.device): device is Actuator {
        return device instanceof Actuator;
    }

    /**
     * Tests if a {@link Device|`Device`} is a {@link Sensor|`Sensor`}.
     *
     * @param {Device} device - The device to check. Defaults to `this.device`.
     * @returns {device is Actuator} - Whether the device is an {@link Sensor|`Sensor`}.
     */
    public isSensor(device: Device = this.device): device is Sensor {
        return device instanceof Sensor;
    }

    /** @ignore */
    protected readonly ACTUATOR_TYPE_ICON = ACTUATOR_TYPE_ICON;
    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT       = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly ACTUATOR_TYPE_DISPLAY = ACTUATOR_TYPE_DISPLAY;
    /** @ignore */
    protected readonly SENSOR_TYPE_ICON    = SENSOR_TYPE_ICON;
    /** @ignore */
    protected readonly SENSOR_TYPE_DISPLAY = SENSOR_TYPE_DISPLAY;
}
