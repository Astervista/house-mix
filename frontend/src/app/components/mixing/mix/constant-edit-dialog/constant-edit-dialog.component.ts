/**
 *  This module contains the {@link ConstantEditDialogComponent|`ConstantEditDialogComponent`} and related classes.
 *
 *  @module
 */
import {Component, Inject} from '@angular/core';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {Datum, DatumType, DatumTypeColor, DatumTypeColorBase} from '@common/mixing/mix/datum';
import {MatError, MatFormField, MatHint, MatInput, MatInputModule, MatLabel} from '@angular/material/input';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors} from '@angular/forms';
import {MatTimepicker, MatTimepickerInput} from '@angular/material/timepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatIcon} from '@angular/material/icon';
import {provideLuxonDateAdapter} from '@angular/material-luxon-adapter';
import {DateTime} from 'luxon';
import {MatDialogComponent} from '../../../../utils/better-mat-dialog';
import {MatCheckbox} from '@angular/material/checkbox';
import {ColorPickerComponent} from '../../../auxiliary/color-picker/color-picker.component';
import {InputReturnBehaviorDirective} from '../../../../directives/input-return-behavior/input-return-behavior.directive';
import {ColorTempPickerComponent} from '../../../auxiliary/color-temp-picker/color-temp-picker.component';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatCard, MatCardModule} from '@angular/material/card';
import {TimePickerComponent} from '../../../auxiliary/time-picker/time-picker.component';

// noinspection ES6UnusedImports
import type {MatDatepicker} from '@angular/material/datepicker';

// noinspection ES6UnusedImports
import type {ConnectionSourceFromConstant} from '@common/mixing/mix/mix';

/** Date format option for the {@link DateTime|`DateTime`}. */
export
/** Date format option for the {@link DateTime|`DateTime`}. */
const DATE_FORMAT = {
    parse:   {
        dateInput: 'yyyy-MM-dd',
        timeInput: 'HH:mm:ss'
    },
    display: {
        dateInput:          'yyyy-MM-dd',
        monthYearLabel:     'MMM yyyy',
        dateA11yLabel:      'yyyy-MM-dd',
        monthYearA11yLabel: 'MMMM yyyy',
        timeOptionLabel:    'HH:mm:ss',
        timeInput:          'HH:mm:ss'
    }
};

/**
 * A dialog for changing the value of a {@link ConnectionSourceFromConstant|`ConnectionSourceFromConstant`}.
 *
 * @component
 * @componentSelector `<house-mix-constant-edit-dialog>`
 */
@Component({
               selector:    'house-mix-constant-edit-dialog',
               imports: [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   MatLabel,
                   MatFormField,
                   MatInput,
                   ReactiveFormsModule,
                   MatTimepickerInput,
                   MatTimepicker,
                   MatDatepickerModule,
                   MatNativeDateModule,
                   MatHint,
                   MatIcon,
                   MatCheckbox,
                   ColorPickerComponent,
                   InputReturnBehaviorDirective,
                   ColorTempPickerComponent,
                   MatError,
                   MatFormFieldModule,
                   MatInputModule,
                   MatCardModule,
                   MatCard,
                   MatIconButton,
                   TimePickerComponent
               ],
               providers:   [
                   // Luxon can be provided globally to your app by adding `provideLuxonDateAdapter`
                   // to your app config. We provide it at the component level here, due to limitations
                   // of our example generation script.
                   provideLuxonDateAdapter(DATE_FORMAT)
               ],
               templateUrl: './constant-edit-dialog.component.html',
               styleUrl:    './constant-edit-dialog.component.scss'
           })
export class ConstantEditDialogComponent extends MatDialogComponent<ConstantEditDialogData, ConstantEditDialogResponse> {

    /** The currently inserted value. */
    protected selectedValue: unknown = null;

    /** {@link FormControl|`FormControl`} handling the {@link MatCheckbox|`MatCheckbox`} for the result value in case of {@link DatumType.BOOLEAN|`BOOLEAN`}. */
    protected booleanFormControl: FormControl<boolean | null>      = new FormControl<boolean>(false);
    /** {@link FormControl|`FormControl`} handling the {@link MatInput|`MatInput`} or {@link ColorTempPickerComponent|`ColorPickerComponent`} for the result value in case of {@link DatumType.NUMBER|`NUMBER`} or {@link DatumType.COLOR_TEMP|`COLOR_TEMP`}. */
    protected numberFormControl: FormControl<number | null>        = new FormControl<number>(0);
    /** {@link FormControl|`FormControl`} handling the {@link MatInput|`MatInput`} for the result value in case of {@link DatumType.STRING|`STRING`}. */
    protected stringFormControl: FormControl<string | null>        = new FormControl<string>('');
    /** {@link FormControl|`FormControl`} handling the {@link ColorPickerComponent|`ColorPickerComponent`} for the result value in case of {@link DatumType.COLOR|`COLOR`}. */
    protected colorFormControl: FormControl<DatumTypeColor | null> = new FormControl<DatumTypeColor>(new DatumTypeColor(DatumTypeColorBase.RGB, 255, 255, 255));
    /** {@link FormControl|`FormControl`} handling the {@link TimePickerComponent|`TimePickerComponent`} for the result value in case of {@link DatumType.TIME|`TIME`} or {@link DatumType.DATE_TIME|`DATE_TIME`}. */
    protected timeFormControl: FormControl<DateTime | null>        = new FormControl<DateTime>(DateTime.fromJSDate(new Date()), this.validateDateTime.bind(this));
    /** {@link FormControl|`FormControl`} handling the {@link MatDatepicker|`MatDatepicker`} for the result value in case of {@link DatumType.DATE|`DATE`} or {@link DatumType.DATE_TIME|`DATE_TIME`}. */
    protected dateFormControl: FormControl<DateTime | null>        = new FormControl<DateTime>(DateTime.fromJSDate(new Date()), this.validateDateTime.bind(this));

    /** Temporary time value when switching between time-picking methods. */
    private dateTimeTempDate: Date | null = null;
    /** Temporary date value when switching between date-picking methods. */
    private dateTimeTempTime: Date | null = null;

    /** Whether the clock should be shown for choosing the time, instead of a text input. */
    protected clockVisible: boolean    = true;
    /** Whether the calendar should be shown for choosing the date, instead of a text input. */
    protected calendarVisible: boolean = true;


    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ConstantEditDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<ConstantEditDialogComponent, ConstantEditDialogResponse>} matDialogRef - The dialog reference.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: ConstantEditDialogData,
        matDialogRef: MatDialogRef<ConstantEditDialogComponent, ConstantEditDialogResponse>
    ) {
        super(data, matDialogRef);
        switch (data.type) {
            case DatumType.STRING: {
                const string       = (data.value as string | null) ?? Datum.getDefaultForType(data.type) as string;
                this.selectedValue = string;
                this.stringFormControl.setValue(string);
                this.stringFormControl.valueChanges.subscribe(value => {
                    this.selectedValue = value;
                });
                break;
            }
            case DatumType.COLOR: {
                const color         = (data.value as DatumTypeColor | null) ?? Datum.getDefaultForType(data.type) as DatumTypeColor;
                this.colorFormControl.setValue(color);
                this.colorFormControl.valueChanges.subscribe(value => {
                    if (value != null) {
                        this.selectedValue = value;
                    }
                });
                break;
            }
            case DatumType.COLOR_TEMP:
            case DatumType.NUMBER: {
                const number       = (data.value as number | null) ?? Datum.getDefaultForType(data.type) as number;
                this.selectedValue = number;
                this.numberFormControl.setValue(number);
                this.numberFormControl.addValidators((control: AbstractControl) => {
                    if (this.data.numberStep != null) {
                        return control.value % this.data.numberStep != 0 ? {invalidStep: true} : null;
                    }
                    return null;
                });
                this.numberFormControl.valueChanges.subscribe(value => {
                    if (this.numberFormControl.valid) {
                        this.selectedValue = value;
                    } else {
                        this.selectedValue = null;
                    }
                });
                break;
            }
            case DatumType.BOOLEAN: {
                const boolean      = (data.value as boolean | null) ?? Datum.getDefaultForType(data.type) as boolean;
                this.selectedValue = boolean;
                this.booleanFormControl.setValue(boolean);
                this.booleanFormControl.valueChanges.subscribe(value => {
                    this.selectedValue = value;
                });
                break;
            }
            case DatumType.TIME: {
                const date         = data.value == null ? new Date() : new Date(data.value as Date);
                this.selectedValue = date;
                this.timeFormControl.setValue(DateTime.fromJSDate(date));
                this.timeFormControl.valueChanges.subscribe(value => {
                    if (value?.isValid !== true) {
                        this.selectedValue = null;
                        return;
                    }
                    this.selectedValue = value.toJSDate();
                });
                break;
            }
            case DatumType.DATE: {
                const date         = data.value == null ? new Date() : new Date(data.value as Date);
                this.selectedValue = date;
                this.dateFormControl.setValue(DateTime.fromJSDate(date));
                this.dateFormControl.valueChanges.subscribe((value: DateTime | null) => {
                    if (value?.isValid !== true) {
                        this.selectedValue = null;
                        return;
                    }
                    this.selectedValue = value.toJSDate();
                });
                break;
            }
            case DatumType.DATE_TIME: {
                this.calendarVisible = false;
                this.clockVisible    = false;
                this.dateTimeTempDate = data.value == null ? new Date() : new Date(data.value as Date);
                this.dateTimeTempTime = data.value == null ? new Date() : new Date(data.value as Date);

                this.selectedValue = new Date(
                    this.dateTimeTempDate.getFullYear(),
                    this.dateTimeTempDate.getMonth(),
                    this.dateTimeTempDate.getDate(),
                    this.dateTimeTempTime.getHours(),
                    this.dateTimeTempTime.getMinutes(),
                    this.dateTimeTempTime.getSeconds()
                );

                this.timeFormControl.setValue(DateTime.fromJSDate((data.value as Date | null) ?? Datum.getDefaultForType(data.type) as Date));
                this.timeFormControl.valueChanges.subscribe(valueLux => {
                    const value = valueLux?.toJSDate() ?? null;
                    if ((value == null) || (this.dateTimeTempDate == null)) {
                        this.selectedValue = null;
                    } else {
                        this.selectedValue = new Date(
                            this.dateTimeTempDate.getFullYear(),
                            this.dateTimeTempDate.getMonth(),
                            this.dateTimeTempDate.getDate(),
                            value.getHours(),
                            value.getMinutes(),
                            value.getSeconds()
                        );
                    }
                    this.dateTimeTempTime = value;
                });

                this.dateFormControl.setValue(DateTime.fromJSDate(data.value as Date));
                this.dateFormControl.valueChanges.subscribe((valueLux: DateTime | null) => {
                    const value = valueLux?.toJSDate() ?? null;
                    if ((value == null) || (this.dateTimeTempTime == null)) {
                        this.selectedValue = null;
                    } else {
                        this.selectedValue = new Date(
                            value.getFullYear(),
                            value.getMonth(),
                            value.getDate(),
                            this.dateTimeTempTime.getHours(),
                            this.dateTimeTempTime.getMinutes(),
                            this.dateTimeTempTime.getSeconds()
                        );
                    }
                    this.dateTimeTempDate = value;
                });
                break;
            }
        }
    }

    /**
     * The title of the dialog, constructed given the data type being of the value being edited.
     *
     * @returns {string} - The title.
     */
    protected getTitle(): string {
        switch (this.data.type) {
            case DatumType.STRING: {
                return 'Set string value';
            }
            case DatumType.COLOR: {
                return 'Set color';
            }
            case DatumType.COLOR_TEMP: {
                return 'Set color temperature';
            }
            case DatumType.NUMBER: {
                return 'Set numerical value';
            }
            case DatumType.BOOLEAN: {
                return 'Set boolean value';
            }
            case DatumType.TIME: {
                return 'Set time';
            }
            case DatumType.DATE: {
                return 'Set date';
            }
            case DatumType.DATE_TIME: {
                return 'Set date and time';
            }
        }
    }

    /** The selected color. If the selected value is not a {@link DatumTypeColor|`DatumTypeColor`}, `null` is returned. */
    protected get selectedColor(): DatumTypeColor | null {
        if (this.selectedValue instanceof DatumTypeColor) {
            return this.selectedValue;
        } else {
            return null;
        }
    }

    /**
     * If the data entered in the dialog is valid, closes the dialog with the currently inserted data
     * as a return value.
     */
    protected confirm(): void {
        if (this.selectedValue != null) {
            this.closeDialog({successful: true, value: this.selectedValue});
        }
    }

    /**
     * Validator for {@link ConstantEditDialogComponent#dateFormControl|`dateFormControl`} and {@link ConstantEditDialogComponent#timeFormControl|`timeFormControl`}.
     *
     * @param {AbstractControl} control - The {@link FormControl|`FormControl`} to check.
     * @returns {ValidationErrors | null} The result of the validation.
     */
    private validateDateTime(control: AbstractControl): ValidationErrors | null {
        if ((control as FormControl<DateTime | null>).value?.isValid !== true) {
            return {invalidDate: true};
        }
        return null;
    }

    /** @ignore */
    protected readonly DatumType = DatumType;
    /** @ignore */
    protected readonly DatumTypeColorBase = DatumTypeColorBase;
}

/**
 * Default values when opening the {@link ConstantEditDialogComponent|`ConstantEditDialogComponent`}.
 */
export interface ConstantEditDialogData {
    /** The type of the value to edit in the dialog. */
    type: DatumType,
    /** The initial value. */
    value: unknown,
    /** The name of the {@link Datum|`Datum`} that is being edited. */
    datumName?: string,
    /** Whether to leave the option to clear the datum, returning `null`. */
    canClear?: boolean,
    /** Lower bound when choosing a number. */
    numberMin?: number,
    /** Upper bound when choosing a number. */
    numberMax?: number,
    /** Step size when choosing a number. */
    numberStep?: number,
    /** Unit suffix when choosing a number. */
    numberSuffix?: string
}

/**
 * The returning value from {@link ConstantEditDialogComponent|`ConstantEditDialogComponent`}.
 */
export interface ConstantEditDialogResponse {
    /** Whether the dialog was closed successfully. */
    successful: boolean,
    /** The chosen value. */
    value: unknown
}
