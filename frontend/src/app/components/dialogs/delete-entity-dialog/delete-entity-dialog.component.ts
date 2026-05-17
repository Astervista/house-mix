/**
 *  This module contains the {@link DeleteEntityDialogComponent|`DeleteEntityDialogComponent`} and related classes.
 *
 *  @module
 */
import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {MatError, MatFormField, MatLabel} from '@angular/material/input';
import {MatOption, MatSelect, MatSelectTrigger} from '@angular/material/select';
import {MatButton} from '@angular/material/button';
import {DeleteGroupChildFate, DeleteGroupOptions} from '@common/devices/group/rest-classes';
import {GroupInfo, groupsToDialogSelect} from '../change-group-dialog/change-group-dialog.component';
import {Group} from '@common/devices/group/group';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {EntityType} from '@common/devices/constants';
import {Sensor} from '@common/devices/sensor/sensor';
import {Actuator} from '@common/devices/actuator/actuator';
import {LoadingStatus} from '../../../utils/enums';
import {GroupService} from '../../../services/group.service';
import {MixPhase, MixPositionInfo, MixTarget} from '@common/mixing/mix/rest-classes';
import {DeviceService} from '../../../services/device.service';
import {LoadingScrimComponent} from '../../auxiliary/loading-scrim/loading-scrim.component';
import {MatIcon} from '@angular/material/icon';
import {UnavailableParents} from '@common/devices/rest-classes';
import {NgTemplateOutlet} from '@angular/common';
import {SystemOrigin} from '@common/system/constants';
import {SystemEntity} from '../../system/constants';
import {SystemParameter} from '@common/system/parameter/system-parameter';
import {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';
import {SystemTimer} from '@common/system/timer/system-timer';
import {SystemService} from '../../../services/system.service';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';
import {Adjustment} from '@common/system/adjustment/adjustment';

// noinspection ES6UnusedImports
import {Device} from '@common/devices/device';
// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';
// noinspection ES6UnusedImports
import type {MatDialog} from '@angular/material/dialog';

/**
 * A dialog for confirming the deletion of a {@link Sensor|`Sensor`}, {@link Actuator|`Actuator`},
 * {@link Group|`Group`}, {@link SystemTimer|`SystemTimer`}, {@link SystemParameter|`SystemParameter`},
 * {@link DeviceMonitorDevice|`DeviceMonitorDevice`} or {@link Adjustment|`Adjustment`} from the system.
 *
 * The dialog requests confirmation for deletion and also - when deleting a {@link Group|`Group`} -
 * allows the user to choose a {@link DeleteGroupChildFate|`DeleteGroupChildFate`}
 * and eventual destination parent for the orphan children.
 *
 * @see {@link DeleteEntityDialogData|`DeleteEntityDialogData`} - The input data.
 * @see The result is {@link DeleteGroupOptions|`DeleteGroupOptions`} when confirming deletion of a
 * {@link Group|`Group`}, `true` otherwise if deletion is confirmed, `false` in any case the dialog
 * is dismissed.
 *
 * @component
 * @componentSelector `<house-mix-delete-entity-dialog>`
 */
@Component({
               selector:    'house-mix-delete-entity-dialog',
               imports:     [
                   MatDialogTitle,
                   MatRadioGroup,
                   ReactiveFormsModule,
                   MatRadioButton,
                   MatFormField,
                   MatLabel,
                   MatSelect,
                   MatOption,
                   MatError,
                   MatDialogActions,

                   MatDialogContent,
                   MatButton,
                   LoadingScrimComponent,
                   MatIcon,
                   NgTemplateOutlet,
                   MatSelectTrigger,
                   InputReturnBehaviorDirective
               ],
               templateUrl: './delete-entity-dialog.component.html',
               styleUrl:    './delete-entity-dialog.component.scss'
           })
export class DeleteEntityDialogComponent extends MatDialogComponent<DeleteEntityDialogData, DeleteGroupOptions | boolean> {

    /** The chosen {@link DeleteGroupChildFate|`DeleteGroupChildFate`} and eventual destination for the orphan children. */
    protected fateResult: DeleteGroupOptions | null = null;

    /** The {@link FormControl|`FormControl`} handling the {@link DeleteGroupChildFate|`DeleteGroupChildFate`} input field, when deleting a {@link Group|`Group`}. */
    protected orphanFateFormControl: FormControl<DeleteGroupChildFate | null> = new FormControl<DeleteGroupChildFate | null>(DeleteGroupChildFate.CURRENT_LEVEL, Validators.required);
    /** The {@link FormControl|`FormControl`} handling the destination group for the orphan children, when deleting a {@link Group|`Group`}. */
    protected parentGroupFormControl: FormControl<string | null>              = new FormControl<string | null>(null);

    /** The {@link FormGroup|`FormGroup`} handling all the controls in this dialog. */
    protected formGroup: FormGroup = new FormGroup(
        {
            orphanFate:  this.orphanFateFormControl,
            parentGroup: this.parentGroupFormControl
        },
        this.validateHierarchy.bind(this)
    );

    /** The groups to show in the orphan children destination group selection when deleting a {@link Group|`Group`}. */
    protected groups: GroupInfo[] = [];


    /** The {@link LoadingStatus|`LoadingStatus`} of the request loading {@link DeleteEntityDialogComponent#deleteLocks|`deleteLocks`}. */
    protected deleteLocksLoadingStatus: LoadingStatus       = LoadingStatus.LOADING;
    /**
     * The {@link MixPositionInfo|`MixPositionInfo`} of the {@link Mix|`Mix`es} depending on the entity
     * to be deleted that prevent its deletion.
     */
    protected deleteLocks: MixPositionInfo[] | null         = null;
    /**
     * The {@link MixPositionInfo|`MixPositionInfo`} of the {@link Mix|`Mix`es} depending on the entity
     *  to be deleted that prevent its deletion, but that are relative to {@link Mix|`Mix`es} linked to
     *  the same device that is being deleted.
     */
    protected selfLocks: MixPositionInfo[] | null           = null;
    /**
     * The parents that can't be chosen as destination for the orphan children, because
     * links between {@link Mix|`Mix`es} would break.
     */
    protected unavailableParents: UnavailableParents | null = null;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {DeleteEntityDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<DeleteEntityDialogComponent, DeleteGroupOptions>} matDialogRef - The dialog reference.
     * @param {GroupService} groupService - The {@link Group|`Group`} service. Instantiated by dependency injection.
     * @param {DeviceService} deviceService - The {@link Device|`Device`} service. Instantiated by dependency injection.
     * @param {SystemService} systemService - The system service. Instantiated by dependency injection.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: DeleteEntityDialogData,
        matDialogRef: MatDialogRef<DeleteEntityDialogComponent, DeleteGroupOptions>,
        private groupService: GroupService,
        private deviceService: DeviceService,
        private systemService: SystemService
    ) {
        super(data, matDialogRef);
        if (data.entityType == EntityType.GROUP) {
            this.formGroup.valueChanges.subscribe((values: { orphanFate: DeleteGroupChildFate | null, parentGroup: string | null }) => {
                if (data.groupToDelete.hasChildren) {
                    if (this.formGroup.invalid) {
                        this.fateResult = null;
                    } else {
                        if (values.orphanFate === DeleteGroupChildFate.CHOOSE_WHERE) {
                            if (values.parentGroup == null) {
                                this.fateResult = null;
                                return;
                            }
                            this.fateResult = {
                                fate:   values.orphanFate,
                                parent: values.parentGroup
                            };
                        } else {
                            this.fateResult = {
                                fate: values.orphanFate
                            };
                        }
                    }
                } else {
                    this.fateResult = {
                        fate: null
                    };
                }
            });
            this.groups =
                groupsToDialogSelect(data.groupNames, data.groupDisplays)
                    .filter(a => a.name != data.groupToDelete.name);
            if (!data.groupToDelete.hasChildren) {
                this.fateResult = {
                    fate: null
                };
            } else {
                this.fateResult = {
                    fate: DeleteGroupChildFate.CURRENT_LEVEL
                };
            }
        }
        this.loadDeleteLocks();
    }

    /**
     * The title of the dialog, based on the entity that's being deleted.
     */
    protected get title(): string {
        switch (this.data.entityType) {
            case EntityType.SENSOR:
                return 'Delete sensor';
            case EntityType.GROUP:
                return 'Delete group';
            case EntityType.ACTUATOR:
                return 'Delete actuator';
            case SystemEntity.TIMER:
                return 'Delete system timer';
            case SystemEntity.PARAMETER:
                return 'Delete system parameter';
            case SystemEntity.DEVICE_STATUS:
                return 'Stop monitoring device';
            case SystemEntity.ADJUSTMENT:
                return 'Delete behavior adjustment';
        }
    }

    /**
     * Whether the entity can be deleted, or is locked by some dependency.
     */
    protected get canDelete(): boolean {
        return this.deleteLocks == null || this.deleteLocks.length == 0;
    }

    /**
     * Whether the dialog is invalid and thus the dialog confirm button should be disabled.
     */
    protected get confirmDisabled(): boolean {
        if (this.data.entityType == EntityType.GROUP) {
            return !this.canDelete || this.fateResult == null;
        } else {
            return !this.canDelete;
        }
    }

    /**
     * An instance of {@link DeleteGroupOptions|`DeleteGroupOptions`} or a `boolean`
     * result given the current status of the dialog, or `null` if the dialog status is invalid.
     */
    protected get result(): DeleteGroupOptions | boolean | null {
        if (this.data.entityType == EntityType.GROUP) {
            return this.fateResult;
        } else {
            return this.canDelete;
        }
    }

    /**
     * Requests the {@link DeleteEntityDialogComponent#deleteLocks|`deleteLocks`} and
     * {@link DeleteEntityDialogComponent#selfLocks|`selfLocks`} from the server relative to
     * the entity that is currently being deleted.
     */
    protected loadDeleteLocks(): void {
        this.deleteLocksLoadingStatus = LoadingStatus.LOADING;
        this.deleteLocks              = null;
        this.selfLocks                = null;
        this.unavailableParents       = null;
        let lockPromise: Promise<MixPositionInfo[]>;
        const data                    = this.data;
        switch (data.entityType) {
            case EntityType.GROUP:

                lockPromise = this
                    .groupService
                    .getUnavailableParents({name: data.groupToDelete.name})
                    .then(result => {
                        this.unavailableParents = result;
                        return this.groupService.getDeleteLocks({name: data.groupToDelete.name});
                    });
                break;
            case EntityType.SENSOR:
                lockPromise = this.deviceService.getSensorDeleteLocks({name: data.sensorToDelete.name});
                break;
            case EntityType.ACTUATOR:
                lockPromise = this.deviceService.getActuatorDeleteLocks({name: data.actuatorToDelete.name});
                break;
            case SystemEntity.TIMER:
                lockPromise = this.systemService.getTimerDeleteLocks({name: data.timerToDelete.name});
                break;
            case SystemEntity.PARAMETER:
                lockPromise = this.systemService.getParameterDeleteLocks({name: data.parameterToDelete.name});
                break;
            case SystemEntity.DEVICE_STATUS:
                lockPromise = this.systemService.getDeviceMonitorDeviceDeleteLocks({name: data.deviceToDelete.name});
                break;
            case SystemEntity.ADJUSTMENT:
                lockPromise = Promise.resolve([]);
                break;
        }
        lockPromise
            .then(locks => {
                this.deleteLocksLoadingStatus = LoadingStatus.LOADED;
                const selfLocks               = locks.filter(lock => {
                    switch (data.entityType) {
                        case SystemEntity.DEVICE_STATUS:
                        case SystemEntity.TIMER:
                        case SystemEntity.PARAMETER:
                        case SystemEntity.ADJUSTMENT:
                            return false;
                        case EntityType.SENSOR:
                            return lock.phase == MixPhase.SENSORS && lock.target == MixTarget.DEVICE && lock.sensorName == data.sensorToDelete.name;
                        case EntityType.GROUP:
                            return (lock.phase == MixPhase.SENSORS && lock.target == MixTarget.GROUP && lock.groupName == data.groupToDelete.name)
                                   || (lock.phase == MixPhase.ACTUATORS && lock.target == MixTarget.GROUP && lock.groupName == data.groupToDelete.name);
                        case EntityType.ACTUATOR:
                            return lock.phase == MixPhase.ACTUATORS && lock.target == MixTarget.DEVICE && lock.actuatorName == data.actuatorToDelete.name;
                    }
                    return true;
                });
                this.selfLocks                = selfLocks;
                this.deleteLocks              = locks.filter(
                    lock => !selfLocks.includes(lock)
                );
            })
            .catch(() => {
                this.deleteLocksLoadingStatus = LoadingStatus.ERROR;
            });
    }

    /**
     * Validation function for the {@link DeleteEntityDialogComponent#formGroup|`formGroup`}.
     *
     * @param {AbstractControl<{name: string | null, displayName: string | null, topLevel: boolean | null, parentGroup: string | null} | null>} control
     *          The {@link FormGroup|`FormGroup`} to validate.
     * @returns {ValidationErrors | null} - The results of validation. The possible errors are:
     *                                      - `sonOfNoGroup` when no destination group is selected but the
     *                                        {@link DeleteGroupChildFate|`DeleteGroupChildFate`} requires one,
     *                                      - `unavailable` if the chosen parent is one of
     *                                        {@link DeleteEntityDialogComponent#unavailableParents|`unavailableParents`}.
     */
    private validateHierarchy(control: AbstractControl<{ orphanFate: DeleteGroupChildFate | null, parentGroup: string | null } | null>): ValidationErrors | null {
        if (control.value == null) {
            return null;
        }
        if (control.value.orphanFate === DeleteGroupChildFate.CURRENT_LEVEL) {
            return null;
        } else if (control.value.orphanFate === DeleteGroupChildFate.ROOT_LEVEL) {
            if (this.unavailableParents?.names.includes(null) ?? true) {
                return {unavailable: true};
            }
            return null;
        } else {
            if (control.value.parentGroup == null) {
                return {sonOfNoGroup: true};
            } else {
                if (this.unavailableParents?.names.includes(control.value.parentGroup) ?? true) {
                    return {unavailable: true};
                }
                return null;
            }
        }
    }

    /**
     * Get the display name of one of the {@link DeleteEntityDialogComponent#groups|`groups`} to choose from, by {@link Group#name|`Group.name`}.
     *
     * @param {string} group - The unique name of the group.
     * @returns {string} - The display name of the group.
     */
    protected getDisplayName(group: string): string {
        return this.groups.find(g => g.name === group)?.displayName ?? group;
    }

    /**
     * Check whether the selected parent group is an invalid choice.
     *
     * @returns {boolean} - `true` if the current selection is part of {@link DeleteEntityDialogComponent#unavailableParents|`unavailableParents`},
     *                      and thus it's an invalid choice of a parent group, `false` otherwise.
     */
    protected get selectedUnavailable(): boolean {
        if (this.parentGroupFormControl.value == null) {
            return true;
        }
        return this.unavailableParents?.names.includes(this.parentGroupFormControl.value) ?? false;
    }

    /**
     * If the data entered in the dialog is valid, closes the dialog with the currently inserted data
     * as a return value.
     */
    protected confirm(): void {
        if (this.canDelete && !this.confirmDisabled) {
            this.closeDialog(this.result);
        }
    }

    /** @ignore */
    protected readonly DeleteGroupChildFate = DeleteGroupChildFate;
    /** @ignore */
    protected readonly EntityType           = EntityType;
    /** @ignore */
    protected readonly LoadingStatus        = LoadingStatus;
    /** @ignore */
    protected readonly MixPhase             = MixPhase;
    /** @ignore */
    protected readonly MixTarget            = MixTarget;
    /** @ignore */
    protected readonly SystemOrigin         = SystemOrigin;
    /** @ignore */
    protected readonly SystemEntity         = SystemEntity;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using
 * {@link DeleteEntityDialogComponent|`DeleteEntityDialogComponent`}
 * when deleting a {@link Group|`Group`}.
 */
export interface DeleteEntityDialogDataGroup {
    /** The {@link Group#name|`name`s} of all the groups in the system, in the same order as {@link DeleteEntityDialogDataGroup#groupDisplays|`groupDisplays`}. */
    groupNames: string[];
    /** The {@link Group#displayName|`displayName`s} of all the groups in the system, in the same order as {@link DeleteEntityDialogDataGroup#groupNames|`groupNames`}. */
    groupDisplays: string[];
    /** The entity to be deleted is a {@link Group|`Group`}. */
    entityType: EntityType.GROUP;
    /** The {@link Group|`Group`} to be deleted. */
    groupToDelete: Group;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using
 * {@link DeleteEntityDialogComponent|`DeleteEntityDialogComponent`}
 * when deleting a {@link Sensor|`Sensor`}.
 */
export interface DeleteEntityDialogDataSensor {
    /** The entity to be deleted is a {@link Sensor|`Sensor`}. */
    entityType: EntityType.SENSOR;
    /** The {@link Sensor|`Sensor`} to be deleted. */
    sensorToDelete: Sensor;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using
 * {@link DeleteEntityDialogComponent|`DeleteEntityDialogComponent`}
 * when deleting an {@link Actuator|`Actuator`}.
 */
export interface DeleteEntityDialogDataActuator {
    /** The entity to be deleted is an {@link Actuator|`Actuator`}. */
    entityType: EntityType.ACTUATOR;
    /** The {@link Actuator|`Actuator`} to be deleted. */
    actuatorToDelete: Actuator;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using
 * {@link DeleteEntityDialogComponent|`DeleteEntityDialogComponent`}
 * when deleting a {@link SystemTimer|`SystemTimer`}.
 */
export interface DeleteEntityDialogDataTimer {
    /** The entity to be deleted is a {@link SystemTimer|`SystemTimer`}. */
    entityType: SystemEntity.TIMER;
    /** The {@link SystemTimer|`SystemTimer`} to be deleted. */
    timerToDelete: SystemTimer;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using
 * {@link DeleteEntityDialogComponent|`DeleteEntityDialogComponent`}
 * when deleting a {@link SystemParameter|`SystemParameter`}.
 */
export interface DeleteEntityDialogDataParameter {
    /** The entity to be deleted is a {@link SystemParameter|`SystemParameter`}. */
    entityType: SystemEntity.PARAMETER;
    /** The {@link SystemParameter|`SystemParameter`} to be deleted. */
    parameterToDelete: SystemParameter;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using
 * {@link DeleteEntityDialogComponent|`DeleteEntityDialogComponent`}
 * when deleting a {@link DeviceMonitorDevice|`DeviceMonitorDevice`}.
 */
export interface DeleteEntityDialogDataDeviceMonitor {
    /** The entity to be deleted is a {@link DeviceMonitorDevice|`DeviceMonitorDevice`}. */
    entityType: SystemEntity.DEVICE_STATUS;
    /** The {@link DeviceMonitorDevice|`DeviceMonitorDevice`} to be deleted. */
    deviceToDelete: DeviceMonitorDevice;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using
 * {@link DeleteEntityDialogComponent|`DeleteEntityDialogComponent`}
 * when deleting an {@link Adjustment|`Adjustment`}.
 */
export interface DeleteEntityDialogDataAdjustment {
    /** The entity to be deleted is a {@link Adjustment|`Adjustment`}. */
    entityType: SystemEntity.ADJUSTMENT;
    /** The {@link Adjustment|`Adjustment`} to be deleted. */
    deviceToDelete: Adjustment<unknown, unknown>;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using
 * {@link DeleteEntityDialogComponent|`DeleteEntityDialogComponent`}.
 */
export type DeleteEntityDialogData = DeleteEntityDialogDataGroup
    | DeleteEntityDialogDataSensor
    | DeleteEntityDialogDataActuator
    | DeleteEntityDialogDataTimer
    | DeleteEntityDialogDataParameter
    | DeleteEntityDialogDataDeviceMonitor
    | DeleteEntityDialogDataAdjustment;
