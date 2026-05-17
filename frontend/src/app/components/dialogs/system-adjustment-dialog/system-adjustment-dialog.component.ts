/**
 *  This module contains the {@link SystemAdjustmentDialogComponent|`SystemAdjustmentDialogComponent`} and related classes.
 *
 *  @module
 */
import {Component, Inject} from '@angular/core';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {Adjustment, AdjustmentAnimationOff, AdjustmentAnimationOn, AdjustmentSplitCommands, AdjustmentType} from '@common/system/adjustment/adjustment';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {MatOption, MatSelect, MatSelectTrigger} from '@angular/material/select';
import {ADJUSTMENT_TYPE_DESCRIPTION, ADJUSTMENT_TYPE_DISPLAY} from '../../system/constants';
import {DynamicSvgComponent} from '../../auxiliary/dynamic-svg/dynamic-svg.component';
import {ACTUATOR_TYPE_DISPLAY, ACTUATOR_TYPE_ICON} from '../../entities/devices/device/constants';
import {TOOLTIP_TIMEOUT} from '../../../utils/constants';
import {MatTooltip} from '@angular/material/tooltip';
import {LoadingStatus} from '../../../utils/enums';
import {Actuator} from '@common/devices/actuator/actuator';
import {LoadingScrimComponent} from '../../auxiliary/loading-scrim/loading-scrim.component';
import {DeviceService} from '../../../services/device.service';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';

// noinspection ES6UnusedImports
import type {Device} from '@common/devices/device';
// noinspection ES6UnusedImports
import type {MatDialog} from '@angular/material/dialog';

/**
 * A dialog for creating and editing an {@link Adjustment|`Adjustment`}.
 *
 * The dialog provides inputs for all the possible implementation of
 * {@link Adjustment|`Adjustment`} with the relative options..
 *
 * @see {@link SystemAdjustmentDialogData|`SystemAdjustmentDialogData`} - The input data.
 * @see {@link Adjustment|`Adjustment`} - The result data.
 *
 * @component
 * @componentSelector `<house-mix-system-adjustment-dialog>`
 */
@Component({
               selector:    'house-mix-system-adjustment-dialog',
               imports:     [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   MatFormField,
                   MatLabel,
                   MatSelect,
                   ReactiveFormsModule,
                   MatOption,
                   MatSelectTrigger,
                   MatHint,
                   MatInput,
                   DynamicSvgComponent,
                   MatTooltip,
                   LoadingScrimComponent,
                   InputReturnBehaviorDirective
               ],
               templateUrl: './system-adjustment-dialog.component.html',
               styleUrl:    './system-adjustment-dialog.component.scss'
           })
export class SystemAdjustmentDialogComponent extends MatDialogComponent<SystemAdjustmentDialogData, Adjustment<unknown, unknown>> {

    /** The {@link FormGroup|`FormGroup`} handling all the controls in this dialog. */
    protected formGroup: FormGroup;

    /** The {@link FormControl|`FormControl`} handling the {@link Adjustment#type|`Adjustment`'s `type`} input field. */
    protected adjustmentTypeFormControl: FormControl<AdjustmentType | null> = new FormControl<AdjustmentType | null>(null, Validators.required);
    /**
     * The {@link FormControl|`FormControl`} handling the minimum brightness input field for
     * {@link AdjustmentAnimationOff|`AdjustmentAnimationOff`} and {@link AdjustmentAnimationOn|`AdjustmentAnimationOn`}.
     */
    protected minBrightnessFormControl: FormControl<number | null>          = new FormControl<number | null>(null, Validators.required);
    /** The {@link FormControl|`FormControl`} handling the input field for the {@link Actuator|`Actuator`} used as target in the adjustment. */
    protected selectedActuatorFormControl: FormControl<Actuator | null>     = new FormControl<Actuator | null>(null, Validators.required);

    /**
     * The list of available {@link Actuator|`Actuator`s} to choose from in
     * {@link SystemAdjustmentDialogComponent#selectedActuatorFormControl|`selectedActuatorFormControl`}.
     */
    protected actuators: Actuator[] | null          = null;
    /**
     *  The {@link LoadingStatus|`LoadingStatus`} of the request loading
     * {@link SystemAdjustmentDialogComponent#actuators|`actuators`}.
     */
    protected actuatorsLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {SystemAdjustmentDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<SystemAdjustmentDialogComponent, Adjustment<unknown, unknown>>} matDialogRef - The dialog reference.
     * @param {DeviceService} deviceService - The {@link Device|`Device`} service. Instantiated by dependency injection.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: SystemAdjustmentDialogData,
        matDialogRef: MatDialogRef<SystemAdjustmentDialogComponent, Adjustment<unknown, unknown>>,
        private deviceService: DeviceService
    ) {
        super(data, matDialogRef);
        this.formGroup = new FormGroup({
                                           adjustmentType: this.adjustmentTypeFormControl
                                       });
        this.adjustmentTypeFormControl.valueChanges.subscribe(() => {

            if (this.isTransitionAdjustment) {
                this.formGroup = new FormGroup({
                                                   adjustmentType:   this.adjustmentTypeFormControl,
                                                   minBrightness:    this.minBrightnessFormControl,
                                                   selectedActuator: this.selectedActuatorFormControl
                                               });
            } else if (this.isSplitAdjustment) {
                this.formGroup = new FormGroup({
                                                   adjustmentType:   this.adjustmentTypeFormControl,
                                                   selectedActuator: this.selectedActuatorFormControl
                                               });
            }
        });
        if (data.edit != null) {
            this.adjustmentTypeFormControl.disable();
            this.adjustmentTypeFormControl.setValue(data.edit.type);
            if (data.edit instanceof AdjustmentAnimationOff || data.edit instanceof AdjustmentAnimationOn) {
                this.minBrightnessFormControl.setValue(data.edit.data.minValidBrightness);
            }
        }
    }

    /**
     *  Whether the {@link SystemAdjustmentDialogComponent#adjustmentTypeFormControl|currently selected}
     *  {@link AdjustmentType|`AdjustmentType`} is {@link AdjustmentType.ANIMATION_ON|`ANIMATION_ON`} or
     *  {@link AdjustmentType.ANIMATION_OFF|`ANIMATION_OFF`}.
     */
    protected get isTransitionAdjustment(): boolean {
        return this.adjustmentTypeFormControl.value == AdjustmentType.ANIMATION_ON || this.adjustmentTypeFormControl.value == AdjustmentType.ANIMATION_OFF;
    }

    /**
     *  Whether the {@link SystemAdjustmentDialogComponent#adjustmentTypeFormControl|currently selected}
     *  {@link AdjustmentType|`AdjustmentType`} is {@link AdjustmentType.ANIMATION_ON|`SPLIT_COMMANDS`}.
     */
    protected get isSplitAdjustment(): boolean {
        return this.adjustmentTypeFormControl.value == AdjustmentType.SPLIT_COMMANDS;
    }

    /**
     * Requests the {@link SystemAdjustmentDialogComponent#actuators|`actuators`} from the server.
     *
     * @param {boolean} invalidate - If `false`, the request is performed only if the {@link SystemAdjustmentDialogComponent#actuators|`actuators`}
     *                               are `null` and thus have never been loaded. If `true`, the fetch is performed either way.
     */
    protected loadActuators(invalidate: boolean = false): void {
        if (invalidate) {
            this.actuatorsLoadingStatus = LoadingStatus.LOADING;
            this.actuators              = null;
            this.selectedActuatorFormControl.setValue(null);
        }
        if (this.actuators == null) {
            this
                .deviceService
                .getActuators()
                .then((result) => {
                    this.actuators              = result;
                    this.actuatorsLoadingStatus = LoadingStatus.LOADED;
                    const edit                  = this.data.edit;
                    if (edit != null && edit instanceof AdjustmentAnimationOff || edit instanceof AdjustmentAnimationOn) {
                        this.selectedActuatorFormControl.setValue(this.actuators.find(otherActuator => otherActuator.name == edit.data.actuatorName) ?? null);
                    }
                })
                .catch(() => {
                    this.actuatorsLoadingStatus = LoadingStatus.ERROR;
                });
        }
    }

    /**
     * Listener for when a keyboard key is pressed when the input linked to
     * {@link SystemAdjustmentDialogComponent#selectedActuatorFormControl|`selectedActuatorFormControl`}
     * is focused.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    protected actuatorListKey(event: KeyboardEvent): void {
        if (event.key == 'ArrowLeft') {
            const index = this.selectedActuatorFormControl.value == null ? this.actuators?.length : this.actuators?.indexOf(this.selectedActuatorFormControl.value);
            if (index != null) {
                this.selectedActuatorFormControl.setValue(this.actuators?.[(index - 1 + this.actuators.length) % this.actuators.length] ?? null);
            }
        } else if (event.key == 'ArrowRight' || event.key == 'Space') {
            const index = this.selectedActuatorFormControl.value == null ? -1 : this.actuators?.indexOf(this.selectedActuatorFormControl.value);
            if (index != null) {
                this.selectedActuatorFormControl.setValue(this.actuators?.[(index + 1) % this.actuators.length] ?? null);
            }
        }
    }

    /**
     * If the data entered in the dialog is valid, closes the dialog with the currently inserted data
     * as a return value.
     */
    protected confirm(): void {
        if (this.formGroup.valid && this.adjustmentTypeFormControl.value != null) {
            switch (this.adjustmentTypeFormControl.value) {
                case AdjustmentType.ANIMATION_ON: {
                    const value = this.formGroup.value as {
                        adjustmentType: AdjustmentType
                        minBrightness: number
                        selectedActuator: Actuator
                    };
                    this.closeDialog(new AdjustmentAnimationOn(this.data.edit?.id ?? 'NEW', {
                        actuatorName:       value.selectedActuator.name,
                        minValidBrightness: value.minBrightness
                    }));
                    break;
                }
                case AdjustmentType.ANIMATION_OFF: {
                    const value = this.formGroup.value as {
                        adjustmentType: AdjustmentType
                        minBrightness: number
                        selectedActuator: Actuator
                    };
                    this.closeDialog(new AdjustmentAnimationOff(this.data.edit?.id ?? 'NEW', {
                        actuatorName:       value.selectedActuator.name,
                        minValidBrightness: value.minBrightness
                    }));
                    break;
                }
                case AdjustmentType.SPLIT_COMMANDS: {
                    const value = this.formGroup.value as {
                        adjustmentType: AdjustmentType
                        selectedActuator: Actuator
                    };
                    this.closeDialog(new AdjustmentSplitCommands(this.data.edit?.id ?? 'NEW', {
                        actuatorName: value.selectedActuator.name
                    }));
                    break;
                }
            }
        }
    }

    /** @ignore */
    protected readonly ADJUSTMENT_TYPES = ADJUSTMENT_TYPES;
    /** @ignore */
    protected readonly ADJUSTMENT_TYPE_DISPLAY     = ADJUSTMENT_TYPE_DISPLAY;
    /** @ignore */
    protected readonly ADJUSTMENT_TYPE_DESCRIPTION = ADJUSTMENT_TYPE_DESCRIPTION;
    /** @ignore */
    protected readonly ACTUATOR_TYPE_ICON          = ACTUATOR_TYPE_ICON;
    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT             = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly ACTUATOR_TYPE_DISPLAY       = ACTUATOR_TYPE_DISPLAY;
    /** @ignore */
    protected readonly LoadingStatus               = LoadingStatus;
}

/**
 * Array containing all the possible {@link AdjustmentType|`AdjustmentType`s}.
 */
const ADJUSTMENT_TYPES = Object.values(AdjustmentType);

/**
 * Input data to a {@link MatDialog|`MatDialog`} using {@link SystemAdjustmentDialogComponent|`SystemAdjustmentDialogComponent`}.
 */
export interface SystemAdjustmentDialogData {
    /** The {@link Adjustment|`Adjustment`} to be edited. If not defined, the dialog operates in creation mode. */
    edit?: Adjustment<unknown, unknown>;
}
