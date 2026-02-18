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

    protected formGroup: FormGroup;

    protected adjustmentTypeFormControl: FormControl<AdjustmentType | null> = new FormControl<AdjustmentType | null>(null, Validators.required);
    protected minBrightnessFormControl: FormControl<number | null>          = new FormControl<number | null>(null, Validators.required);
    protected selectedActuatorFormControl: FormControl<Actuator | null>     = new FormControl<Actuator | null>(null, Validators.required);

    protected actuators: Actuator[] | null          = null;
    protected actuatorsLoadingStatus: LoadingStatus = LoadingStatus.LOADING;


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

    protected get isTransitionAdjustment(): boolean {
        return this.adjustmentTypeFormControl.value == AdjustmentType.ANIMATION_ON || this.adjustmentTypeFormControl.value == AdjustmentType.ANIMATION_OFF;
    }

    protected get isSplitAdjustment(): boolean {
        return this.adjustmentTypeFormControl.value == AdjustmentType.SPLIT_COMMANDS;
    }

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

    protected readonly ADJUSTMENT_TYPES = ADJUSTMENT_TYPES;

    protected readonly ADJUSTMENT_TYPE_DISPLAY     = ADJUSTMENT_TYPE_DISPLAY;
    protected readonly ADJUSTMENT_TYPE_DESCRIPTION = ADJUSTMENT_TYPE_DESCRIPTION;
    protected readonly ACTUATOR_TYPE_ICON          = ACTUATOR_TYPE_ICON;
    protected readonly TOOLTIP_TIMEOUT             = TOOLTIP_TIMEOUT;
    protected readonly ACTUATOR_TYPE_DISPLAY       = ACTUATOR_TYPE_DISPLAY;
    protected readonly LoadingStatus               = LoadingStatus;
}

const ADJUSTMENT_TYPES = Object.values(AdjustmentType);

export interface SystemAdjustmentDialogData {
    edit?: Adjustment<unknown, unknown>;
}
