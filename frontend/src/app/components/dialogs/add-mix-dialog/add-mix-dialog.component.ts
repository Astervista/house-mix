/**
 *  This module contains the {@link AddMixDialogComponent|`AddMixDialogComponent`} and related classes.
 *
 *  @module
 */
import {Component, Inject, ViewChild} from '@angular/core';
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
import {MixPhase, MixPositionInfo, MixTarget} from '@common/mixing/mix/rest-classes';
import {ReactiveFormsModule} from '@angular/forms';
import {EntityNamesInputsComponent} from '../../auxiliary/entity-names-inputs/entity-names-inputs.component';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';
import {MixingService} from '../../../services/mixing.service';

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';
// noinspection ES6UnusedImports
import type {Device} from '@common/devices/device';

/**
 * Default values when opening the {@link AddMixDialogComponent|`AddMixDialogComponent`}.
 */
export interface AddMixDialogDefaults {
    /** The phase the mix will be placed in. */
    phase: MixPhase;
    /** The target of the mix. */
    target: MixTarget;
}

/**
 * A dialog for retrieving information before creating a {@link Mix|`Mix`}.
 *
 * The dialog will return a {@link MixPositionInfo|`MixPositionInfo`} that
 * points to the entity the {@link Mix|`Mix`} will be associated with.
 *
 * @see {@link AddMixDialogDefaults|`AddMixDialogDefaults`} - The input data (can be `null`).
 * @see {@link MixPositionInfo|`MixPositionInfo`} - The result data.
 * @component
 * @componentSelector `<house-mix-add-mix-dialog>`
 */
@Component({
               selector:    'house-mix-add-mix-dialog',
               imports: [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   DynamicSvgComponent,
                   LoadingScrimComponent,
                   MatTooltip,
                   ReactiveFormsModule,
                   EntityNamesInputsComponent,
                   InputReturnBehaviorDirective
               ],
               templateUrl: './add-mix-dialog.component.html',
               styleUrl:    './add-mix-dialog.component.scss'
           })
export class AddMixDialogComponent extends MatDialogComponent<AddMixDialogDefaults | null, MixPositionInfo> {

    /** The phase in the calculation of the system the {@link Mix|`Mix`} will be placed in. */
    private _selectedPhase: MixPhase   = MixPhase.SENSORS;
    /** The target the {@link Mix|`Mix`} will be associated with. */
    private _selectedTarget: MixTarget = MixTarget.DEVICE;

    /** All the actuators that don't have a {@link Mix|`Mix`} associated with them yet, an thus are available for mixing. */
    protected actuators: Actuator[] | null          = null;
    /** The loading status of the {@link AddMixDialogComponent#actuators|available actuators}. */
    protected actuatorsLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /** All the sensors that don't have a {@link Mix|`Mix`} associated with them yet, and thus are available for mixing. */
    protected sensors: Sensor[] | null            = null;
    /** The loading status of the {@link AddMixDialogComponent#sensors|available sensors}. */
    protected sensorsLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /** All the groups that don't have a {@link Mix|`Mix`} associated with them yet in the {@link MixPhase.SENSORS|`SENSORS`} phase, an thus are available for mixing. */
    protected leftGroups: Group[] | null             = null;
    /** The loading status of the {@link AddMixDialogComponent#leftGroups|available groups in the sensor phase}. */
    protected leftGroupsLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /** All the groups that don't have a {@link Mix|`Mix`} associated with them yet in the {@link MixPhase.ACTUATORS|`ACTUATORS`} phase, an thus are available for mixing. */
    protected rightGroups: Group[] | null             = null;
    /** The loading status of the {@link AddMixDialogComponent#rightGroups|available groups in the actuator phase}. */
    protected rightGroupsLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /** The names of the already existing mixes in the center. */
    protected mixNames: string[] | null            = null;
    /** The loading status of the {@link AddMixDialogComponent#mixNames|center mix names}. */
    protected mixNamesLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /** If the new mix isn't in the {@link MixPhase.CENTER|`CENTER`} phase, the entity it will be associated with. */
    protected selectedElement: Group | Actuator | Sensor | null = null;

    /**
     * The inputs where the names of a new {@link Mix|`Mix`} in the {@link MixPhase.CENTER|`CENTER`} phase are entered.
     *
     * @viewChild {@link EntityNamesInputsComponent|`EntityNamesInputsComponent`}
     */
    @ViewChild(EntityNamesInputsComponent)
    protected mixNamesComponent?: EntityNamesInputsComponent;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {AddMixDialogDefaults | null} data - The initial configuration of the dialog.
     * @param {MatDialogRef<AddMixDialogComponent, MixPositionInfo>} dialogRef - The dialog reference.
     * @param {DeviceService} deviceService - The {@link Device|`Device`} service. Instantiated by dependency injection.
     * @param {GroupService} groupService - The {@link Group|`Group`} service. Instantiated by dependency injection.
     * @param {MixingService} mixService - The {@link Mix|`Mix`} service. Instantiated by dependency injection.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: AddMixDialogDefaults | null,
        dialogRef: MatDialogRef<AddMixDialogComponent, MixPositionInfo>,
        private deviceService: DeviceService,
        private groupService: GroupService,
        private mixService: MixingService
    ) {
        super(data, dialogRef);
        if (
            (data?.phase == MixPhase.SENSORS && data.target != MixTarget.CENTER)
            || (data?.phase == MixPhase.CENTER && data.target == MixTarget.CENTER)
            || (data?.phase == MixPhase.ACTUATORS && data.target != MixTarget.CENTER)
        ) {
            this._selectedPhase  = data.phase;
            this._selectedTarget = data.target;
        }
    }

    /** The phase in the calculation of the system the {@link Mix|`Mix`} will be placed in. */
    public get selectedPhase(): MixPhase {
        return this._selectedPhase;
    }

    /**
     * Set the phase in the calculation of the system the {@link Mix|`Mix`} will be placed in,
     * and reset the {@link AddMixDialogComponent#selectedTarget|`selectedTarget`}.
     */
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

    /** The target the {@link Mix|`Mix`} will be associated with. */
    public get selectedTarget(): MixTarget {
        return this._selectedTarget;
    }

    /**
     * Set the target the {@link Mix|`Mix`} will be associated with,
     * but only if the {@link AddMixDialogComponent#selectedPhase|`selectedPhase`} is correct.
     */
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

    /**
     * Listener for when a keyboard key is pressed when the element controlling
     * {@link AddMixDialogComponent#selectedPhase|`selectedPhase`} is focused.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    protected phaseKey(event: KeyboardEvent): void {
        if (event.key == 'ArrowLeft') {
            const phases       = Object.values(MixPhase);
            const index        = phases.indexOf(this._selectedPhase);
            this.selectedPhase = phases[(index - 1 + phases.length) % phases.length] ?? MixPhase.SENSORS;
        } else if (event.key == 'ArrowRight' || event.key == 'Space') {
            const phases       = Object.values(MixPhase);
            const index        = phases.indexOf(this._selectedPhase);
            this.selectedPhase = phases[(index + 1) % phases.length] ?? MixPhase.SENSORS;
        }
    }

    /**
     * Listener for when a keyboard key is pressed when the element controlling
     * {@link AddMixDialogComponent#selectedTarget|`selectedTarget`} is focused.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    protected targetKey(event: KeyboardEvent): void {

        if (event.key == 'ArrowLeft' || event.key == 'ArrowRight' || event.key == 'Space') {
            if (this._selectedTarget == MixTarget.DEVICE) {
                this.selectedTarget = MixTarget.GROUP;
            } else if (this._selectedTarget == MixTarget.GROUP) {
                this.selectedTarget = MixTarget.DEVICE;
            }
        }
    }

    /**
     * Listener for when a keyboard key is pressed when the element controlling
     * {@link AddMixDialogComponent#selectedElement|`selectedElement`} is focused.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    protected elementsListKey(event: KeyboardEvent): void {
        let list: (Group | Sensor | Actuator)[];
        if (this._selectedPhase == MixPhase.SENSORS) {
            if (this.selectedTarget == MixTarget.DEVICE) {
                list = this.sensors ?? [];
            } else {
                list = this.leftGroups ?? [];
            }
        } else {
            if (this.selectedTarget == MixTarget.DEVICE) {
                list = this.actuators ?? [];
            } else {
                list = this.rightGroups ?? [];
            }
        }
        if (event.key == 'ArrowLeft') {
            const index          = this.selectedElement == null ? list.length : list.indexOf(this.selectedElement);
            this.selectedElement = list[(index - 1 + list.length) % list.length] ?? null;
        } else if (event.key == 'ArrowRight' || event.key == 'Space') {
            const index          = this.selectedElement == null ? -1 : list.indexOf(this.selectedElement);
            this.selectedElement = list[(index + 1) % list.length] ?? null;
        }
    }

    /**
     * Requests the {@link AddMixDialogComponent#actuators|`actuators`} from the server.
     *
     * @param {boolean} invalidate - If `false`, the request is performed only if the  {@link AddMixDialogComponent#actuators|`actuators`}
     *                               are `null` and thus have never been loaded. If `true`, the fetch is performed either way.
     */
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

    /**
     * Requests the {@link AddMixDialogComponent#sensors|`sensors`} from the server.
     *
     * @param {boolean} invalidate - If `true`, the request is performed only if the {@link AddMixDialogComponent#sensors|`sensors`}
     *                               are `null` and thus have never been loaded. If `false`, the fetch is performed either way.
     */
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

    /**
     * Requests the {@link AddMixDialogComponent#leftGroups|`leftGroups`} or {@link AddMixDialogComponent#rightGroups|`rightGroups`} from the server.
     *
     * @param {boolean} left - If `true`, the groups for the {@link MixPhase.SENSORS|`SENSORS`} phase are loaded, otherwise for the {@link MixPhase.ACTUATORS|`ACTUATORS`} phase.
     * @param {boolean} invalidate - If `true`, the request is performed only if {@link AddMixDialogComponent#leftGroups|`leftGroups`} or {@link AddMixDialogComponent#rightGroups|`rightGroups`}
     *                               is `null` and thus have never been loaded. If `false`, the fetch is performed either way.
     */
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

    /**
     * Requests the {@link AddMixDialogComponent#mixNames|`mixNames`} from the server.
     *
     * @param {boolean} invalidate - If `true`, the request is performed only if the {@link AddMixDialogComponent#mixNames|`mixNames`}
     *                               are `null` and thus have never been loaded. If `false`, the fetch is performed either way.
     */
    protected loadMixNames(invalidate: boolean = false): void {
        if (invalidate) {
            this.mixNamesLoadingStatus = LoadingStatus.LOADING;
            this.mixNames              = null;
        }
        if (this.mixNames == null) {
            this
                .mixService
                .getCenterMixNames()
                .then((result) => {
                    this.mixNames              = result;
                    this.mixNamesLoadingStatus = LoadingStatus.LOADED;
                })
                .catch(() => {
                    this.mixNamesLoadingStatus = LoadingStatus.ERROR;
                });
        }
    }

    /**
     * An instance of {@link MixPositionInfo|`MixPositionInfo`} given
     * the current status of the dialog, or `null` if the dialog status is invalid.
     */
    protected get result(): MixPositionInfo | null {
        if (this.selectedPhase == MixPhase.CENTER) {
            if (this.selectedTarget == MixTarget.CENTER) {
                if (this.mixNamesComponent != null
                    && this.mixNamesComponent.nameFormControl.valid
                    && this.mixNamesComponent.nameFormControl.value != null
                    && this.mixNamesComponent.displayNameFormControl.valid
                    && this.mixNamesComponent.displayNameFormControl.value != null
                ) {
                    return {
                        phase:          this.selectedPhase,
                        target:         this.selectedTarget,
                        mixName:        this.mixNamesComponent.nameFormControl.value,
                        mixDisplayName: this.mixNamesComponent.displayNameFormControl.value
                    };
                } else {
                    return null;
                }
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
                        phase:               this.selectedPhase,
                        target:              this.selectedTarget,
                        actuatorName:        this.selectedElement.name,
                        actuatorDisplayName: this.selectedElement.displayName
                    };
                } else {
                    return null;
                }
            } else { //  MixPhase.SENSORS
                if (this.selectedElement instanceof Sensor) {
                    return {
                        phase:             this.selectedPhase,
                        target:            this.selectedTarget,
                        sensorName:        this.selectedElement.name,
                        sensorDisplayName: this.selectedElement.displayName
                    };
                } else {
                    return null;
                }
            }
        } else { //  MixTarget.GROUP
            if (this.selectedPhase == MixPhase.ACTUATORS) {
                if (this.selectedElement instanceof Group && this.selectedElement.actuatorMix == null) {
                    return {
                        phase:            this.selectedPhase,
                        target:           this.selectedTarget,
                        groupName:        this.selectedElement.name,
                        groupDisplayName: this.selectedElement.displayName
                    };
                } else {
                    return null;
                }
            } else { //  MixPhase.SENSORS
                if (this.selectedElement instanceof Group && this.selectedElement.sensorMix == null) {
                    return {
                        phase:            this.selectedPhase,
                        target:           this.selectedTarget,
                        groupName:        this.selectedElement.name,
                        groupDisplayName: this.selectedElement.displayName
                    };
                } else {
                    return null;
                }
            }
        }
    }

    /**
     * If the data entered in the dialog is valid, closes the dialog with the currently inserted data
     * as a return value.
     */
    protected confirm(): void {
        const result = this.result;
        if (this.result != null) {
            this.closeDialog(result);
        }
    }

    /** @ignore */
    protected readonly MixPhase              = MixPhase;
    /** @ignore */
    protected readonly MixTarget             = MixTarget;
    /** @ignore */
    protected readonly LoadingStatus         = LoadingStatus;
    /** @ignore */
    protected readonly SENSOR_TYPE_ICON      = SENSOR_TYPE_ICON;
    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT       = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly SENSOR_TYPE_DISPLAY   = SENSOR_TYPE_DISPLAY;
    /** @ignore */
    protected readonly ACTUATOR_TYPE_DISPLAY = ACTUATOR_TYPE_DISPLAY;
    /** @ignore */
    protected readonly ACTUATOR_TYPE_ICON    = ACTUATOR_TYPE_ICON;

}
