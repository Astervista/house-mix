/**
 *  This module contains the {@link SystemTimerDialogComponent|`SystemTimerDialogComponent`} and related classes.
 *
 *  @module
 */
import {AfterViewInit, Component, Inject, ViewChild} from '@angular/core';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {SystemTimer, TimerType} from '@common/system/timer/system-timer';
import {EntityNamesInputsComponent} from '../../auxiliary/entity-names-inputs/entity-names-inputs.component';
import {MatButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';

// noinspection ES6UnusedImports
import type {MatDialog} from '@angular/material/dialog';

/**
 * The structure of inputs for {@link SystemTimerDialogComponent#formGroup|`SystemTimerDialogComponent.formGroup`}.
 *
 * @notExported
 */
interface FormGroupValue {
    /** {@link FormControl|`FormControl`} value for {@link SystemTimer#name|`name`}. */
    name: string | null
    /** {@link FormControl|`FormControl`} value for {@link SystemTimer#displayName|`displayName`}. */
    displayName: string | null
    /** {@link FormControl|`FormControl`} value for {@link SystemTimer#type|`type`}. */
    type: TimerType | null
    /** {@link FormControl|`FormControl`} value for the hour value for {@link SystemTimer#occurrence|`occurrence`}, if applicable. */
    hour: number | null
    /** {@link FormControl|`FormControl`} value for the minute value for {@link SystemTimer#occurrence|`occurrence`}, if applicable. */
    minute: number | null
}

/**
 * A dialog for creating and editing a {@link SystemTimer|`SystemTimer`}.
 *
 * This component handles the correct input for {@link SystemTimer#occurrence|`SystemTimer.occurrence`}
 * given its {@link SystemTimer#type|`SystemTimer.type`}.
 *
 * @see {@link SystemTimerDialogData|`SystemTimerDialogData`} - The input data.
 * @see {@link SystemTimer|`SystemTimer`} - The result data.
 * @component
 * @componentSelector `<house-mix-system-timer-dialog>`
 */
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
                   MatHint,
                   InputReturnBehaviorDirective
               ],
               templateUrl: './system-timer-dialog.component.html',
               styleUrl:    './system-timer-dialog.component.scss'
           })
export class SystemTimerDialogComponent extends MatDialogComponent<SystemTimerDialogData, SystemTimer> implements AfterViewInit {

    /** The {@link FormGroup|`FormGroup`} handling all the controls in this dialog. */
    protected formGroup?: FormGroup;

    /**
     * The component where the names to use for the {@link SystemTimer|`SystemTimer`} are entered.
     *
     * @viewChild {@link EntityNamesInputsComponent|`EntityNamesInputsComponent`}
     */
    @ViewChild(EntityNamesInputsComponent)
    private nameInputsComponent?: EntityNamesInputsComponent;

    /** The {@link FormControl|`FormControl`} handling the {@link SystemTimer#type|`SystemTimer.type`} input field. */
    protected typeFormControl: FormControl<TimerType | null> = new FormControl<TimerType | null>(null, Validators.required);
    /**
     * The {@link FormControl|`FormControl`} handling the input field containing the minutes value used to build
     *  {@link SystemTimer#occurrence|`SystemTimer.occurrence`}.
     */
    protected hourFormControl: FormControl<number | null>    = new FormControl<number | null>(null);
    /**
     * The {@link FormControl|`FormControl`} handling the input field containing the hour value used to build
     *  {@link SystemTimer#occurrence|`SystemTimer.occurrence`}.
     */
    protected minuteFormControl: FormControl<number | null>  = new FormControl<number | null>(null);

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {SystemTimerDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<SystemTimerDialogComponent, SystemTimer>} dialogRef - The dialog reference.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: SystemTimerDialogData,
        dialogRef: MatDialogRef<SystemTimerDialogComponent, SystemTimer>
    ) {
        super(data, dialogRef);
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
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
            if (this.data.edit != null) {
                this.typeFormControl.setValue(this.data.edit.type);
                this.nameInputsComponent.nameFormControl.disable();
                switch (this.data.edit.type) {
                    case TimerType.DAILY: {
                        this.hourFormControl.setValue(Math.floor(this.data.edit.occurrence / 60));
                        this.minuteFormControl.setValue(this.data.edit.occurrence % 60);
                        break;
                    }
                    case TimerType.HOURLY: {
                        this.minuteFormControl.setValue(this.data.edit.occurrence);
                        break;
                    }
                    case TimerType.MINUTE_INTERVAL: {
                        this.minuteFormControl.setValue(this.data.edit.occurrence);
                        break;
                    }
                }
                this.nameInputsComponent.displayNameFormControl.setValue(this.data.edit.displayName);
                this.nameInputsComponent.nameFormControl.setValue(this.data.edit.name);
            }
        }
    }

    /**
     * Validation function to check for {@link SystemTimerDialogComponent#formGroup|`SystemTimerDialogComponent.formGroup`}.
     *
     * @param {AbstractControl<FormGroupValue | null>} control - The {@link FormGroup|`FormGroup`} to validate.
     * @returns {ValidationErrors | null} - The results of validation. The possible errors include:
     *                                      - `required-minute` if the minute value is missing,
     *                                      - `required-hour` if the hour value is missing for daily timers,
     *                                      - `min-hour`, `max-hour`, `min-minute`, `max-minute` if values
     *                                        are outside their allowed ranges for the selected {@link TimerType|`TimerType`}.
     */
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

    /**
     * If the data entered in the dialog is valid, closes the dialog with the currently inserted data
     * as a return value.
     */
    protected confirm(): void {
        const result = this.formGroup?.getRawValue() as FormGroupValue | null;
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

    /** @ignore */
    protected readonly TimerType   = TimerType;
    /** @ignore */
    protected readonly SystemTimer = SystemTimer;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using {@link SystemTimerDialogComponent|`SystemTimerDialogComponent`}.
 */
export interface SystemTimerDialogData {
    /** The names that can't be used for {@link SystemTimer#name|`SystemTimer.name`}. */
    forbiddenNames: string[];
    /** The {@link SystemTimer|`SystemTimer`} to be edited. If not defined, the dialog operates in creation mode. */
    edit?: SystemTimer;
}

