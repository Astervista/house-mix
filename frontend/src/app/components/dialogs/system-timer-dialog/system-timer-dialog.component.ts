import {AfterViewInit, Component, Inject, ViewChild} from '@angular/core';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {SystemTimer, TimerType} from '@common/system/timer/system-timer';
import {EntityNamesInputsComponent} from '../../auxiliary/entity-names-inputs/entity-names-inputs.component';
import {MatButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';

interface FormGroupValue {
    name: string | null
    displayName: string | null
    type: TimerType | null
    hour: number | null
    minute: number | null
}

@Component({
               selector:    'house-mix-system-timer-dialog',
               imports: [
                   EntityNamesInputsComponent,
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   MatRadioGroup,
                   ReactiveFormsModule,
                   MatRadioButton,
                   MatError,
                   MatFormField,
                   MatLabel,
                   MatInput,
                   MatHint
               ],
               templateUrl: './system-timer-dialog.component.html',
               styleUrl:    './system-timer-dialog.component.scss'
           })
export class SystemTimerDialogComponent extends MatDialogComponent<SystemTimerDialogData, SystemTimer> implements AfterViewInit {

    protected formGroup?: FormGroup;

    @ViewChild(EntityNamesInputsComponent)
    private nameInputsComponent?: EntityNamesInputsComponent;

    protected typeFormControl: FormControl<TimerType | null> = new FormControl<TimerType | null>(null, Validators.required);
    protected hourFormControl: FormControl<number | null>    = new FormControl<number | null>(null);
    protected minuteFormControl: FormControl<number | null>  = new FormControl<number | null>(null);

    constructor(
        @Inject(MAT_DIALOG_DATA) data: SystemTimerDialogData,
        dialogRef: MatDialogRef<SystemTimerDialogComponent, SystemTimer>
    ) {
        super(data, dialogRef);
    }

    public ngAfterViewInit(): void {
        if (this.nameInputsComponent != null) {
            this.formGroup = new FormGroup(
                {
                    name:        this.nameInputsComponent.nameFormControl,
                    displayName: this.nameInputsComponent.displayNameFormControl,
                    type:        this.typeFormControl,
                    hour:        this.hourFormControl,
                    minute:      this.minuteFormControl
                },
                this.validate.bind(this)
            );

        }
    }

    private validate(control: AbstractControl<FormGroupValue | null>): ValidationErrors | null {

        if (control.value?.type != null) {
            const errors: string[] = [];
            if (control.value.minute == null || control.value.minute % 1 != 0) {
                this.minuteFormControl.setErrors({
                                                     required: true
                                                 })
                errors.push("required-minute");
            }
            switch (control.value.type) {
                case TimerType.DAILY: {
                    if (control.value.hour == null || control.value.hour % 1 != 0) {
                        this.hourFormControl.setErrors({
                                                           required: true
                                                       })
                        errors.push("required-hour")
                    }
                    if (control.value.hour != null && control.value.hour < 0) {
                        this.hourFormControl.setErrors({
                                                           min: true
                                                       })
                        errors.push("min-hour")
                    }
                    if (control.value.hour != null && control.value.hour > 23) {
                        this.hourFormControl.setErrors({
                                                           max: true
                                                       })
                        errors.push("max-hour")
                    }
                    if (control.value.minute != null && control.value.minute < 0) {
                        this.minuteFormControl.setErrors({
                                                           min: true
                                                       })
                        errors.push("min-minute")
                    }
                    if (control.value.minute != null && control.value.minute > 59) {
                        this.minuteFormControl.setErrors({
                                                           max: true
                                                       })
                        errors.push("max-minute")
                    }
                    break;
                }
                case TimerType.HOURLY: {
                    if (control.value.minute != null && control.value.minute < 0) {
                        this.minuteFormControl.setErrors({
                                                             min: true
                                                         })
                        errors.push("min-minute")
                    }
                    if (control.value.minute != null && control.value.minute > 59) {
                        this.minuteFormControl.setErrors({
                                                             max: true
                                                         })
                        errors.push("max-minute")
                    }
                    break;
                }
                case TimerType.MINUTE_INTERVAL: {
                    if (control.value.minute != null && control.value.minute < 0) {
                        this.minuteFormControl.setErrors({
                                                             min: true
                                                         })
                        errors.push("min-minute")
                    }
                    if (control.value.minute != null && control.value.minute > 1440) {
                        this.minuteFormControl.setErrors({
                                                             max: true
                                                         })
                        errors.push("max-minute")
                    }
                    break;
                }
            }
            if (errors.length > 0) {
                const result: Record<string, boolean> = {};
                for (const error of errors) {
                    result[error] = true;
                }
                return result;
            }
        }

        this.minuteFormControl.setErrors(null);
        this.hourFormControl.setErrors(null);

        return null;
    }

    protected confirm(): void {
        const result = this.formGroup?.value as FormGroupValue | null;
        if (
            result != null
            && this.formGroup?.valid == true
            && result.type != null
            && result.minute != null
            && result.name != null
            && result.displayName != null
        ) {
            let minute = result.minute;
            if (result.type == TimerType.DAILY) {
                if (result.hour == null) {
                    return
                }
                minute += result.hour * 60;
            }
            this.closeDialog(new SystemTimer(
                result.name,
                result.displayName,
                result.type,
                minute
            ));
        }
    }

    protected readonly SystemTimer = SystemTimer;
    protected readonly TimerType   = TimerType;
}


export interface SystemTimerDialogData {
    forbiddenNames: string[];
}

