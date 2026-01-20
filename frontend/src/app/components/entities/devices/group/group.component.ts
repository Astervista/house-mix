import {Component, EventEmitter, HostBinding, HostListener, Input, Output} from '@angular/core';
import { Group } from "@common/devices/group/group";
import {MatTooltip} from '@angular/material/tooltip';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';

@Component({
  selector: 'house-mix-group',
               imports: [
                   MatTooltip
               ],
  templateUrl: './group.component.html',
  styleUrl: './group.component.scss'
})
export class GroupComponent {

    @Input({required: true}) public group!: Group;

    @Input() public otherGroups: Group[] | null = null;
    @Input() public selectedGroup!: Group | null;

    @Output("onSelect") public onSelectEmitter: EventEmitter<Group> = new EventEmitter<Group>();

    @HostListener('click', ["$event"])
    public onClick(event: MouseEvent): void {
        event.stopPropagation();
        this.onSelectEmitter.emit(this.group);
    }

    @HostBinding("class.selected")
    public get isSelected(): boolean {
        return this.group == this.selectedGroup;
    }

    protected isGroupEmpty(group: Group): boolean {
        // TODO: Add sensors
        return (group.groups.length + group.actuators.length) == 0;
    }

    protected getOtherGroup(subgroupName: string): Group | null {
        if (this.otherGroups == null) {
            return null;
        }
        return this.otherGroups.find(group => group.name == subgroupName) ?? null;
    }

    protected readonly TOOLTIP_TIMEOUT = TOOLTIP_TIMEOUT;
}
