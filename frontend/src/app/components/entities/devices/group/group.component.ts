import {Component, EventEmitter, HostBinding, HostListener, Input, Output} from '@angular/core';
import { Group } from "@common/devices/group/group";
import {MatTooltip} from '@angular/material/tooltip';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {DeviceComponent} from '../device/device.component';
import { Actuator } from "@common/devices/actuator/actuator";
import { Sensor } from "@common/devices/sensor/sensor";
import { Device } from "@common/devices/device";

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

    @Input({required: true}) public group!: Group;

    @Input() public otherGroups: Group[] | null = null;
    @Input() public actuators: Actuator[] | null    = null;
    @Input() public sensors: Sensor[] | null    = null;
    @Input() public selected: Group | Device | null = null;

    @Output("onSelect") public onSelectEmitter: EventEmitter<Group | Device> = new EventEmitter<Group | Device>();

    @HostListener('click', ["$event"])
    public onClick(event: MouseEvent): void {
        event.stopPropagation();
        this.onSelectEmitter.emit(this.group);
    }

    @HostBinding("class.selected")
    public get isSelected(): boolean {
        return this.group == this.selected;
    }

    protected isGroupEmpty(group: Group): boolean {
        return (group.groups.length + group.actuators.length + group.sensors.length) == 0;
    }

    protected getOtherGroup(subgroupName: string): Group | null {
        if (this.otherGroups == null) {
            return null;
        }
        return this.otherGroups.find(group => group.name == subgroupName) ?? null;
    }

    protected getActuator(actuatorName: string): Actuator | null {
        if (this.actuators == null) {
            return null;
        }
        return this.actuators.find(actuator => actuator.name == actuatorName) ?? null;
    }

    protected getSensor(sensorName: string): Sensor | null {
        if (this.sensors == null) {
            return null;
        }
        return this.sensors.find(sensor => sensor.name == sensorName) ?? null;
    }

    protected readonly TOOLTIP_TIMEOUT = TOOLTIP_TIMEOUT;
}
