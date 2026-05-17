/**
 *  This module contains the {@link ChangeGroupDialogComponent|`ChangeGroupDialogComponent`} and related classes.
 *
 *  @module
 */
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
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';

// noinspection ES6UnusedImports
import type {Group} from '@common/devices/group/group';
// noinspection ES6UnusedImports
import type {Actuator} from '@common/devices/actuator/actuator';
// noinspection ES6UnusedImports
import type {Sensor} from '@common/devices/sensor/sensor';
// noinspection
import type {Device} from '@common/devices/device';
// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';
// noinspection ES6UnusedImports
import type {MatDialog} from '@angular/material/dialog';

/**
 * The result of a {@link MatDialog|`MatDialog`} using {@link ChangeGroupDialogComponent|`ChangeGroupDialogComponent`}.
 * Can be a `string` containing a {@link Group|`Group`}'s unique {@link Group#name|`name`}, {@link TopmostResult|`TopmostResult`}
 * (with value {@link TOPMOST|`TOPMOST`}) to indicate the root level (no parent) or `null` for negative dialog result.
 */
export type ChangeGroupDialogResult = string | null | TopmostResult;

/**
 * A dialog for changing the parent of a {@link Sensor|`Sensor`},
 * {@link Actuator|`Actuator`} or {@link Group|`Group`}.
 *
 * @see {@link ChangeGroupDialogData|`ChangeGroupDialogData`} - The input data.
 * @see {@link ChangeGroupDialogResult|`ChangeGroupDialogResult`} - The result data.
 *
 * @component
 * @componentSelector `<house-mix-change-group-dialog>`
 */
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
                   MatSelectTrigger,
                   InputReturnBehaviorDirective
               ],
               templateUrl: './change-group-dialog.component.html',
               styleUrl:    './change-group-dialog.component.scss'
           })
export class ChangeGroupDialogComponent extends MatDialogComponent<ChangeGroupDialogData, ChangeGroupDialogResult> {

    /** The {@link FormControl|`FormControl`} handling the result value for the dialog. */
    protected parentGroupFormControl: FormControl<ChangeGroupDialogResult> = new FormControl<ChangeGroupDialogResult>(this.data.sonOfGroup ?? TOPMOST);

    /** The groups to show in the parent selection. */
    protected groups: GroupInfo[] = [];

    /** The {@link LoadingStatus|`LoadingStatus`} of the request loading  {@link ChangeGroupDialogComponent#unavailableParents|`unavailableParents`}. */
    protected unavailableLoading: LoadingStatus = LoadingStatus.LOADING;
    /**
     * The {@link UnavailableParents|`UnavailableParents`} relative to the {@link Group|`Group`s}
     * that are not available as parents because moving the entity into them would break links
     * between {@link Mix|`Mix`es}, with the dependencies that would break.
     */
    protected unavailableParents: UnavailableParents | null = null;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ChangeGroupDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<ChangeGroupDialogComponent, ChangeGroupDialogResult>} dialogRef - The dialog reference.
     * @param {GroupService} groupService - The {@link Group|`Group`} service. Instantiated by dependency injection.
     * @param {DeviceService} deviceService - The {@link Device|`Device`} service. Instantiated by dependency injection.
     */
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

    /**
     * Requests the {@link ChangeGroupDialogComponent#unavailableParents|`unavailableParents`} from the server relative to
     * the entity that is currently being edited.
     */
    protected loadAvailableGroups(): void {
        this.unavailableLoading = LoadingStatus.LOADING;
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

    /**
     * Get the display name of one of the {@link ChangeGroupDialogComponent#groups|`groups`} to choose from, by {@link Group#name|`Group.name`}.
     *
     * @param {string} group - The unique name of the group.
     * @returns {string} - The display name of the group.
     */
    protected getDisplayName(group: string): string {
        return this.groups.find(g => g.name === group)?.displayName ?? group;
    }

    /**
     * Check whether the {@link ChangeGroupDialogComponent#parentGroupFormControl|`selected parent group`}
     * is an invalid choice.
     *
     * @returns {boolean} - `true` if the current selection is part of {@link ChangeGroupDialogComponent#unavailableParents|`unavailableParents`},
     *                      and thus it's an invalid choice of a parent group, `false` otherwise.
     */
    protected get selectedUnavailable(): boolean {
        if (this.parentGroupFormControl.value == null) {
            return true;
        }
        if (this.parentGroupFormControl.value == TOPMOST) {
            return this.unavailableParents?.names.includes(null) ?? false;
        }
        return this.unavailableParents?.names.includes(this.parentGroupFormControl.value as string) ?? false;
    }

    /**
     * Whether the dialog is valid and can be successfully closed.
     */
    protected get canClose(): boolean {
        return this.parentGroupFormControl.value != this.data.sonOfGroup
               && this.parentGroupFormControl.value != null
               && this.unavailableLoading == LoadingStatus.LOADED
               && !this.selectedUnavailable;

    }

    /**
     * If the data entered in the dialog is valid, closes the dialog with the currently inserted data
     * as a return value.
     */
    protected confirm(): void {
        if (this.canClose) {
            this.closeDialog(this.parentGroupFormControl.value);
        }
    }

    /** @ignore */
    protected readonly TOPMOST       = TOPMOST;
    /** @ignore */
    protected readonly LoadingStatus = LoadingStatus;
    /** @ignore */
    protected readonly MixPhase                 = MixPhase;
    /** @ignore */
    protected readonly MixTarget                = MixTarget;
    /** @ignore */
    protected readonly EntityType = EntityType;
}

/**
 * {@link ChangeGroupDialogResult|`ChangeGroupDialogResult`} when the selected result is the root element.
 */
export interface TopmostResult {
    /** The result refers to the root element. */
    topmost: true;
}

/**
 * The singleton intsance of {@link TopmostResult|`TopmostResult`}.
 */
export
/**
 * The singleton instance of {@link TopmostResult|`TopmostResult`}.
 */
const TOPMOST: TopmostResult = {
    topmost: true
};

/**
 * Information about a {@link Group|`Group`} used in {@link ChangeGroupDialogComponent|`ChangeGroupDialogComponent`}.
 */
export interface GroupInfo {
    /** {@link Group#name|`Group.name`}. */
    name: string,
    /** {@link Group#displayName|`Group.displayName`}. */
    displayName: string
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using {@link ChangeGroupDialogComponent|`ChangeGroupDialogComponent`}.
 */
export interface ChangeGroupDialogData {
    /** The {@link Group#name|`name`s} of all the groups in the system, in the same order as {@link ChangeGroupDialogData#groupDisplays|`groupDisplays`}. */
    groupNames: string[];
    /** The {@link Group#displayName|`displayName`s} of all the groups in the system, in the same order as {@link ChangeGroupDialogData#groupNames|`groupNames`}. */
    groupDisplays: string[];
    /** The initial value for the chosen parent group. */
    sonOfGroup: string | null;
    /** The unique name of the entity to be moved. */
    toMove: string;
    /** Whether the entity to be moved is a {@link Group|`Group`}, {@link Actuator|`Actuator`} or {@link Sensor|`Sensor`}. */
    movingEntityType: EntityType;
}

/**
 * Zips the two inputs into a {@link GroupInfo|`GroupInfo`}, sorting the result in alphabetical order according to the
 * value of `groupDisplays`. The names should match by index, and in case of one array being shorter than the other,
 * only the common length is used.
 *
 * @param {string[]} groupNames - The groups' {@link Group#name|`name`s}.
 * @param {string[]} groupDisplays - The groups' {@link Group#displayName|`displayName`s}.
 * @returns {GroupInfo[]} - The array of zipped {@link GroupInfo|`GroupInfo`}.
 */
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
