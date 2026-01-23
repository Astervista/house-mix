import {Component, Inject} from '@angular/core';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {DynamicSvgComponent} from '../../auxiliary/dynamic-svg/dynamic-svg.component';
import {LoadingScrimComponent} from '../../auxiliary/loading-scrim/loading-scrim.component';
import {LoadingStatus} from '../../../utils/enums';
import {Actuator} from '@common/devices/actuator/actuator';
import {Sensor} from '@common/devices/sensor/sensor';
import {Group} from '@common/devices/group/group';
import {DeviceService} from '../../../services/device.service';
import {GroupService} from '../../../services/group.service';
import {GetGroupsOptions} from '@common/devices/group/rest-classes';
import {ACTUATOR_TYPE_DISPLAY, ACTUATOR_TYPE_ICON, SENSOR_TYPE_DISPLAY, SENSOR_TYPE_ICON} from '../../entities/devices/device/constants';
import {MatTooltip} from '@angular/material/tooltip';
import {TOOLTIP_TIMEOUT} from '../../../utils/constants';

@Component({
               selector:    'house-mix-add-mix-dialog',
               imports:     [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   DynamicSvgComponent,
                   LoadingScrimComponent,
                   MatTooltip
               ],
               templateUrl: './add-mix-dialog.component.html',
               styleUrl:    './add-mix-dialog.component.scss'
           })
export class AddMixDialogComponent extends MatDialogComponent<AddMixInfo | null, AddMixInfo> {

    private _selectedPhase: MixPhase   = MixPhase.SENSORS;
    private _selectedTarget: MixTarget = MixTarget.DEVICE;

    protected actuators: Actuator[] | null          = null;
    protected actuatorsLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected sensors: Sensor[] | null            = null;
    protected sensorsLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected leftGroups: Group[] | null             = null;
    protected leftGroupsLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected rightGroups: Group[] | null             = null;
    protected rightGroupsLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected selectedElement: Group | Actuator | Sensor | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: AddMixInfo,
        dialogRef: MatDialogRef<AddMixDialogComponent, AddMixInfo>,
        private deviceService: DeviceService,
        private groupService: GroupService
    ) {
        super(data, dialogRef);
    }

    public get selectedPhase(): MixPhase {
        return this._selectedPhase;
    }

    public set selectedPhase(phase: MixPhase) {
        switch (phase) {
            case MixPhase.ACTUATORS:
            case MixPhase.SENSORS: {
                if (this._selectedTarget == MixTarget.CENTER) {
                    this._selectedTarget = MixTarget.DEVICE;
                }
                break;
            }
            case MixPhase.CENTER: {
                this._selectedTarget = MixTarget.CENTER;
                break;
            }
        }
        this._selectedPhase  = phase;
        this.selectedElement = null;
    }

    public get selectedTarget(): MixTarget {
        return this._selectedTarget;
    }

    public set selectedTarget(target: MixTarget) {
        switch (target) {
            case MixTarget.GROUP:
            case MixTarget.DEVICE:
                if (this._selectedPhase != MixPhase.CENTER) {
                    this._selectedTarget = target;
                }
                break;
            case MixTarget.CENTER:
                if (this._selectedPhase == MixPhase.CENTER) {
                    this._selectedTarget = target;
                }
                break;
        }
        this.selectedElement = null;
    }

    protected loadActuators(invalidate: boolean = false): void {
        if (invalidate) {
            this.actuatorsLoadingStatus = LoadingStatus.LOADING;
            this.actuators              = null;
        }
        if (this.actuators == null) {
            this
                .deviceService
                .getActuators({
                                  mix: null
                              })
                .then((result) => {
                    this.actuators              = result;
                    this.actuatorsLoadingStatus = LoadingStatus.LOADED;
                })
                .catch(() => {
                    this.actuatorsLoadingStatus = LoadingStatus.ERROR;
                });
        }
    }

    protected loadSensors(invalidate: boolean = false): void {
        if (invalidate) {
            this.sensorsLoadingStatus = LoadingStatus.LOADING;
            this.sensors              = null;
        }
        if (this.sensors == null) {
            this
                .deviceService
                .getSensors({
                                mix: null
                            })
                .then((result) => {
                    this.sensors              = result;
                    this.sensorsLoadingStatus = LoadingStatus.LOADED;
                })
                .catch(() => {
                    this.sensorsLoadingStatus = LoadingStatus.ERROR;
                });
        }
    }

    protected loadGroups(left: boolean, invalidate: boolean = false): void {
        if (invalidate) {
            if (left) {
                this.leftGroupsLoadingStatus = LoadingStatus.LOADING;
                this.leftGroups              = null;
            } else {
                this.rightGroupsLoadingStatus = LoadingStatus.LOADING;
                this.rightGroups              = null;
            }
        }
        let reload: boolean;
        let options: GetGroupsOptions;
        if (left) {
            reload  = this.leftGroups == null;
            options = {
                sensorMix: null
            };
        } else {
            reload  = this.rightGroups == null;
            options = {
                actuatorMix: null
            };
        }

        if (reload) {
            this
                .groupService
                .getAllGroups(options)
                .then((result) => {
                    if (left) {
                        this.leftGroups              = result;
                        this.leftGroupsLoadingStatus = LoadingStatus.LOADED;
                    } else {
                        this.rightGroups              = result;
                        this.rightGroupsLoadingStatus = LoadingStatus.LOADED;
                    }
                })
                .catch(() => {
                    if (left) {
                        this.leftGroupsLoadingStatus = LoadingStatus.ERROR;
                    } else {
                        this.rightGroupsLoadingStatus = LoadingStatus.ERROR;
                    }
                });
        }
    }

    protected get result(): AddMixInfo | null {
        if (this.selectedPhase == MixPhase.CENTER) {
            if (this.selectedTarget == MixTarget.CENTER) {
                return {
                    phase:  this.selectedPhase,
                    target: this.selectedTarget
                };
            } else {
                return null;
            }
        }
        if (this.selectedTarget == MixTarget.CENTER) {
            return null;
        } else if (this.selectedTarget == MixTarget.DEVICE) {
            if (this.selectedPhase == MixPhase.ACTUATORS) {
                if (this.selectedElement instanceof Actuator) {
                    return {
                        phase:        this.selectedPhase,
                        target:       this.selectedTarget,
                        actuatorName: this.selectedElement.name
                    };
                } else {
                    return null;
                }
            } else { //  MixPhase.SENSORS
                if (this.selectedElement instanceof Sensor) {
                    return {
                        phase:      this.selectedPhase,
                        target:     this.selectedTarget,
                        sensorName: this.selectedElement.name
                    };
                } else {
                    return null;
                }
            }
        } else { //  MixTarget.GROUP
            if (this.selectedPhase == MixPhase.ACTUATORS) {
                if (this.selectedElement instanceof Group && this.selectedElement.actuatorMix == null) {
                    return {
                        phase:      this.selectedPhase,
                        target:     this.selectedTarget,
                        groupName: this.selectedElement.name
                    }
                } else {
                    return null;
                }
            } else { //  MixPhase.SENSORS
                if (this.selectedElement instanceof Group && this.selectedElement.sensorMix == null) {
                    return {
                        phase:      this.selectedPhase,
                        target:     this.selectedTarget,
                        groupName: this.selectedElement.name
                    }
                } else {
                    return null;
                }
            }
        }
    }

    protected confirm(): void {
        const result = this.result;
        if (this.result != null) {
            this.closeDialog(result);
        }
    }

    protected readonly MixPhase              = MixPhase;
    protected readonly MixTarget             = MixTarget;
    protected readonly LoadingStatus         = LoadingStatus;
    protected readonly SENSOR_TYPE_ICON      = SENSOR_TYPE_ICON;
    protected readonly TOOLTIP_TIMEOUT       = TOOLTIP_TIMEOUT;
    protected readonly SENSOR_TYPE_DISPLAY   = SENSOR_TYPE_DISPLAY;
    protected readonly ACTUATOR_TYPE_DISPLAY = ACTUATOR_TYPE_DISPLAY;
    protected readonly ACTUATOR_TYPE_ICON    = ACTUATOR_TYPE_ICON;
}

export enum MixPhase {
    SENSORS   = 'SENSORS',
    CENTER    = 'CENTER',
    ACTUATORS = 'ACTUATORS'
}

export enum MixTarget {
    DEVICE = 'DEVICE',
    GROUP  = 'GROUP',
    CENTER = 'CENTER',
}

export type AddMixInfo = AddMixInfoSensors | AddMixInfoCenter | AddMixInfoActuators;

export type AddMixInfoSensors = AddMixInfoSensorsDevice | AddMixInfoSensorsGroup;

export interface AddMixInfoCenter {
    phase: MixPhase.CENTER,
    target: MixTarget.CENTER
}

export type AddMixInfoActuators = AddMixInfoActuatorsDevice | AddMixInfoActuatorsGroup;

export interface AddMixInfoSensorsDevice {
    phase: MixPhase.SENSORS,
    target: MixTarget.DEVICE,
    sensorName: string
}

export interface AddMixInfoSensorsGroup {
    phase: MixPhase.SENSORS,
    target: MixTarget.GROUP,
    groupName: string
}

export interface AddMixInfoActuatorsDevice {
    phase: MixPhase.ACTUATORS,
    target: MixTarget.DEVICE,
    actuatorName: string
}

export interface AddMixInfoActuatorsGroup {
    phase: MixPhase.ACTUATORS,
    target: MixTarget.GROUP,
    groupName: string
}
