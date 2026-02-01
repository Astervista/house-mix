import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {MatFormField, MatLabel} from '@angular/material/input';
import {MatOption} from '@angular/material/core';
import {MatSelect, MatSelectTrigger} from '@angular/material/select';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {LoadingStatus} from '../../../utils/enums';
import {LoadingScrimComponent} from '../../auxiliary/loading-scrim/loading-scrim.component';
import {GroupService} from '../../../services/group.service';
import {DeviceService} from '../../../services/device.service';
import {EntityType} from '@common/devices/constants';
import {UnavailableParents} from '@common/devices/rest-classes';
import {MatIcon} from '@angular/material/icon';
import {MixPhase, MixTarget} from '@common/mixing/mix/rest-classes';

export type ChangeGroupDialogResult = string | null | TopmostResult;

@Component({
               selector:    'house-mix-change-group-dialog',
               imports: [
                   MatDialogContent,
                   MatDialogActions,

                   MatButton,
                   MatDialogTitle,
                   MatFormField,
                   MatLabel,
                   MatOption,
                   MatSelect,
                   ReactiveFormsModule,
                   LoadingScrimComponent,
                   MatIcon,
                   MatSelectTrigger
               ],
               templateUrl: './change-group-dialog.component.html',
               styleUrl:    './change-group-dialog.component.scss'
           })
export class ChangeGroupDialogComponent extends MatDialogComponent<ChangeGroupDialogData, ChangeGroupDialogResult>{

    protected parentGroupFormControl: FormControl<ChangeGroupDialogResult> = new FormControl<ChangeGroupDialogResult>(this.data.sonOfGroup ?? TOPMOST);

    protected groups: GroupInfo[] = [];

    protected unavailableLoading: LoadingStatus        = LoadingStatus.LOADING;
    protected unavailableParents: UnavailableParents | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: ChangeGroupDialogData,
        dialogRef: MatDialogRef<ChangeGroupDialogComponent, ChangeGroupDialogResult>,
        private groupService: GroupService,
        private deviceService: DeviceService
    ) {
        super(data, dialogRef);
        this.groups =
            groupsToDialogSelect(data.groupNames, data.groupDisplays)
                .filter(a => a.name != this.data.toMove);
        this.loadAvailableGroups();
    }

    protected loadAvailableGroups(): void {
        this.unavailableLoading = LoadingStatus.LOADING
        switch (this.data.movingEntityType) {
            case EntityType.GROUP:
                this
                    .groupService
                    .getUnavailableParents({name: this.data.toMove})
                    .then(result => {
                        this.unavailableLoading = LoadingStatus.LOADED;
                        this.unavailableParents = result;
                    })
                    .catch(() => {
                        this.unavailableLoading = LoadingStatus.ERROR;
                    });
                break;
            case EntityType.ACTUATOR:
                this
                    .deviceService
                    .getActuatorUnavailableParents({name: this.data.toMove})
                    .then(result => {
                        this.unavailableLoading = LoadingStatus.LOADED;
                        this.unavailableParents = result;
                    })
                    .catch(() => {
                        this.unavailableLoading = LoadingStatus.ERROR;
                    });
                break;
            case EntityType.SENSOR:
                this
                    .deviceService
                    .getSensorUnavailableParents({name: this.data.toMove})
                    .then(result => {
                        this.unavailableLoading = LoadingStatus.LOADED;
                        this.unavailableParents = result;
                    })
                    .catch(() => {
                        this.unavailableLoading = LoadingStatus.ERROR;
                    });
                break;
        }
    }

    protected getDisplayName(group: string): string {
        return this.groups.find(g => g.name === group)?.displayName ?? group;
    }

    protected get selectedUnavailable(): boolean {
        if (this.parentGroupFormControl.value == null) {
            return true;
        }
        if (this.parentGroupFormControl.value == TOPMOST) {
            return this.unavailableParents?.names.includes(null) ?? false;
        }
        return this.unavailableParents?.names.includes(this.parentGroupFormControl.value as string) ?? false;
    }

    protected readonly TOPMOST       = TOPMOST;
    protected readonly LoadingStatus = LoadingStatus;
    protected readonly MixPhase = MixPhase;
    protected readonly MixTarget = MixTarget;

    protected readonly EntityType = EntityType;
}

export interface TopmostResult {
    topmost: true
}

export const TOPMOST: TopmostResult = {
    topmost: true
}

export interface GroupInfo {
    name: string,
    displayName: string
}

export interface ChangeGroupDialogData {
    groupNames: string[];
    groupDisplays: string[];
    sonOfGroup: string | null;
    toMove: string;
    movingEntityType: EntityType;
}

export function groupsToDialogSelect(groupNames: string[], groupDisplays: string[]): GroupInfo[] {
    return groupDisplays
        .map((displayName, index): Partial<GroupInfo> => {
            return {
                name:        groupNames[index],
                displayName: displayName
            };
        })
        .filter(
            (a: Partial<GroupInfo>): a is GroupInfo => {
                return a.name != undefined && a.displayName != undefined;
            }
        )
        .sort(
            (a, b) =>
                a.displayName.localeCompare(b.displayName)
        );
}
