/**
 *  This module contains the {@link GroupComponent|`GroupComponent`} and related classes.
 *
 *  @module
 */
import {Component, EventEmitter, HostBinding, HostListener, Input, Output} from '@angular/core';
import { Group } from "@common/devices/group/group";
import {MatTooltip} from '@angular/material/tooltip';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {DeviceComponent} from '../device/device.component';
import { Actuator } from "@common/devices/actuator/actuator";
import { Sensor } from "@common/devices/sensor/sensor";
import { Device } from "@common/devices/device";

/**
 * A component that can display a {@link Group|`Group`}.
 *
 * @component
 * @componentSelector `<house-mix-group>`
 */
@Component({
  selector: 'house-mix-group',
               imports: [
                   MatTooltip,
                   DeviceComponent
               ],
  templateUrl: './group.component.html',
  styleUrl: './group.component.scss'
})
export class GroupComponent {

    /**
     * The {@link Group|`Group`} to display.
     *
     * @input
     * @required
     */
    @Input({required: true})
    public group!: Group;

    /**
     * List containing all the {@link Group|`Group`s} in the system, used to find the definition of a subgroup from its name.
     *
     * @input
     */
    @Input()
    public otherGroups: Group[] | null = null;
    /**
     * List containing all the {@link Actuator|`Actuator`s} in the system, used to find the definition of a child actuator from its name.
     *
     * @input
     */
    @Input()
    public actuators: Actuator[] | null    = null;
    /**
     * List containing all the {@link Sensor|`Sensor`s} in the system, used to find the definition of a child sensor from its name.
     *
     * @input
     */
    @Input()
    public sensors: Sensor[] | null    = null;
    /**
     * The currently selected element. Passed to the subgroups to notify the whole hierarchy of changes in the selected element.
     *
     * @input
     */
    @Input()
    public selected: Group | Device | null = null;

    /**
     * Gets triggered when a descendant element (or this {@link Group|`Group`}) is clicked.
     *
     * @output
     * @outputAlias onSelect
     */
    @Output("onSelect")
    public onSelectEmitter: EventEmitter<Group | Device> = new EventEmitter<Group | Device>();

    /**
     * Click handler for the element.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    @HostListener('click', ["$event"])
    public onClick(event: MouseEvent): void {
        event.stopPropagation();
        this.onSelectEmitter.emit(this.group);
    }

    /**
     * Whether the component is selected. A selected component shows a colored outline on the element.
     *
     * @hostBinding class.selected
     */
    @HostBinding("class.selected")
    public get isSelected(): boolean {
        return this.group == this.selected;
    }

    /**
     * Tests if a {@link Group|`Group`} is empty, meaning if it has no {@link Group#actuators|actuators},
     * {@link Group#sensors|sensors} or {@link Group#groups|subgroups}.
     *
     * @param {Group} group - The {@link Group|`Group`} to test.
     * @returns {boolean} - Whether the {@link Group|`Group`} is empty.
     */
    protected isGroupEmpty(group: Group): boolean {
        return (group.groups.length + group.actuators.length + group.sensors.length) == 0;
    }

    /**
     * Finds the {@link Group|`Group`} instance given its {@link Group#name|`name`}.
     *
     * @param {string} subgroupName - The {@link Group#name|`name`} of the {@link Group|`Group`} to find.
     * @returns {Group | null} - The {@link Group|`Group`} instance, or `null` if not found, or if
     *                           {@link GroupComponent#otherGroups|`otherGroups`} is null.
     */
    protected getOtherGroup(subgroupName: string): Group | null {
        if (this.otherGroups == null) {
            return null;
        }
        return this.otherGroups.find(group => group.name == subgroupName) ?? null;
    }

    /**
     * Finds the {@link Actuator|`Actuator`} instance given its {@link Actuator#name|`name`}.
     *
     * @param {string} actuatorName - The {@link Actuator#name|`name`} of the {@link Actuator|`Actuator`} to find.
     * @returns {Actuator | null} - The {@link Actuator|`Actuator`} instance, or `null` if not found, or if
     *                              {@link GroupComponent#actuators|`actuators`} is null.
     */
    protected getActuator(actuatorName: string): Actuator | null {
        if (this.actuators == null) {
            return null;
        }
        return this.actuators.find(actuator => actuator.name == actuatorName) ?? null;
    }

    /**
     * Finds the {@link Sensor|`Sensor`} instance given its {@link Sensor#name|`name`}.
     *
     * @param {string} sensorName - The {@link Sensor#name|`name`} of the {@link Sensor|`Sensor`} to find.
     * @returns {Sensor | null} - The {@link Sensor|`Sensor`} instance, or `null` if not found, or if
     *                              {@link GroupComponent#sensors|`sensors`} is null.
     */
    protected getSensor(sensorName: string): Sensor | null {
        if (this.sensors == null) {
            return null;
        }
        return this.sensors.find(sensor => sensor.name == sensorName) ?? null;
    }

    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT = TOOLTIP_TIMEOUT;
}
