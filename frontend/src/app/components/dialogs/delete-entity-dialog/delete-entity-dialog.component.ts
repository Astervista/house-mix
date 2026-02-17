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
import {SystemParameter} from '@common/system/parameter/system-parameter';
import {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';
import {SystemTimer} from '@common/system/timer/system-timer';
import {SystemService} from '../../../services/system.service';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';

@Component({
               selector:    'house-mix-delete-entity-dialog',
               imports: [
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
export class DeleteEntityDialogComponent extends MatDialogComponent<DeleteEntityDialogData, DeleteGroupOptions | boolean>{

    protected fateResult: DeleteGroupOptions | null = null;

    protected orphanFateFormControl: FormControl<DeleteGroupChildFate | null> = new FormControl<DeleteGroupChildFate | null>(DeleteGroupChildFate.CURRENT_LEVEL, Validators.required);
    protected parentGroupFormControl: FormControl<string | null> = new FormControl<string | null>(null);

    protected formGroup : FormGroup = new FormGroup(
        {
            orphanFate: this.orphanFateFormControl,
            parentGroup: this.parentGroupFormControl
        },
        this.validateHierarchy.bind(this)
    );

    protected groups: GroupInfo[] = [];

    protected deleteLocksLoadingStatus: LoadingStatus = LoadingStatus.LOADING;
    protected deleteLocks: MixPositionInfo[] | null             = null;
    protected selfLocks: MixPositionInfo[] | null = null;
    protected unavailableParents: UnavailableParents | null = null;

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
                            }
                        } else {
                            this.fateResult = {
                                fate: values.orphanFate
                            }
                        }
                    }
                } else {
                    this.fateResult = {
                        fate: null
                    }
                }
            });
            this.groups =
                groupsToDialogSelect(data.groupNames, data.groupDisplays)
                    .filter(a => a.name != data.groupToDelete.name);
            if (!data.groupToDelete.hasChildren) {
                this.fateResult = {
                    fate: null
                }
            } else {
                this.fateResult = {
                    fate: DeleteGroupChildFate.CURRENT_LEVEL
                }
            }
        }
        this.loadDeleteLocks();
    }

    protected get canDelete(): boolean {
        return this.deleteLocks == null || this.deleteLocks.length == 0;
    }

    protected get confirmDisabled(): boolean {
        if (this.data.entityType == EntityType.GROUP) {
            return !this.canDelete || this.fateResult == null;
        } else {
            return !this.canDelete;
        }
    }

    protected get result(): DeleteGroupOptions | boolean | null {
        if (this.data.entityType == EntityType.GROUP) {
            return this.fateResult;
        } else {
            return this.canDelete;
        }
    }

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
                        return this.groupService.getDeleteLocks({name: data.groupToDelete.name})
                    })
                break;
            case EntityType.SENSOR:
                lockPromise = this.deviceService.getSensorDeleteLocks({name: data.sensorToDelete.name})
                break;
            case EntityType.ACTUATOR:
                lockPromise = this.deviceService.getActuatorDeleteLocks({name: data.actuatorToDelete.name})
                break;
            case SystemOrigin.TIMER:
                lockPromise = this.systemService.getTimerDeleteLocks({name: data.timerToDelete.name});
                break;
            case SystemOrigin.PARAMETER:
                lockPromise = this.systemService.getParameterDeleteLocks({name: data.parameterToDelete.name});
                break;
            case SystemOrigin.DEVICE_STATUS:
                lockPromise = this.systemService.getDeviceMonitorDeviceDeleteLocks({name: data.deviceToDelete.name});
                break;
        }
        lockPromise
            .then(locks => {
                this.deleteLocksLoadingStatus = LoadingStatus.LOADED;
                const selfLocks   = locks.filter(lock => {
                    switch (data.entityType) {
                        case SystemOrigin.DEVICE_STATUS:
                        case SystemOrigin.TIMER:
                        case SystemOrigin.PARAMETER:
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
                this.selfLocks = selfLocks
                this.deleteLocks  = locks.filter(
                    lock => !selfLocks.includes(lock)
                );
            })
            .catch(() => {
                this.deleteLocksLoadingStatus = LoadingStatus.ERROR;
            });
    }

    private validateHierarchy(control: AbstractControl<{ orphanFate: DeleteGroupChildFate | null, parentGroup: string | null } | null>): ValidationErrors | null {
        if (control.value == null) {
            return null;
        }
        if (control.value.orphanFate === DeleteGroupChildFate.CURRENT_LEVEL) {
            return null;
        } else if (control.value.orphanFate === DeleteGroupChildFate.ROOT_LEVEL) {
            if (this.unavailableParents?.names.includes(null) ?? true) {
                return {unavailable: true}
            }
            return null;
        } else {
            if (control.value.parentGroup == null) {
                return {sonOfNoGroup: true};
            } else {
                if (this.unavailableParents?.names.includes(control.value.parentGroup) ?? true) {
                    return {unavailable: true}
                }
                return null;
            }
        }
    }

    protected getDisplayName(group: string): string {
        return this.groups.find(g => g.name === group)?.displayName ?? group;
    }

    protected get selectedUnavailable(): boolean {
        if (this.parentGroupFormControl.value == null) {
            return true;
        }
        return this.unavailableParents?.names.includes(this.parentGroupFormControl.value) ?? false;
    }

    protected confirm(): void {
        if (this.canDelete && !this.confirmDisabled) {
            this.closeDialog(this.result);
        }
    }

    protected readonly DeleteGroupChildFate = DeleteGroupChildFate;
    protected readonly EntityType    = EntityType;
    protected readonly LoadingStatus = LoadingStatus;
    protected readonly MixPhase  = MixPhase;
    protected readonly MixTarget    = MixTarget;
    protected readonly SystemOrigin = SystemOrigin;
}

export type DeleteEntityDialogData = {
    groupNames: string[];
    groupDisplays: string[];
    entityType: EntityType.GROUP;
    groupToDelete: Group;
} | {
    entityType: EntityType.SENSOR;
    sensorToDelete: Sensor
} | {
    entityType: EntityType.ACTUATOR;
    actuatorToDelete: Actuator
} | {
    entityType: SystemOrigin.TIMER;
    timerToDelete: SystemTimer
} | {
    entityType: SystemOrigin.PARAMETER;
    parameterToDelete: SystemParameter
} | {
    entityType: SystemOrigin.DEVICE_STATUS;
    deviceToDelete: DeviceMonitorDevice
}
