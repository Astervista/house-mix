import {Component, Inject} from '@angular/core';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {Datum, DatumType, DatumTypeColor, DatumTypeColorBase} from '@common/mixing/mix/datum';
import {MatError, MatFormField, MatHint, MatInput, MatInputModule, MatLabel} from '@angular/material/input';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors} from '@angular/forms';
import {MatTimepicker, MatTimepickerInput, MatTimepickerToggle} from '@angular/material/timepicker';
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

export const DATE_FORMAT = {
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
                   MatTimepickerToggle,
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
                   MatDatepickerModule,
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

    protected selectedValue: unknown = null;

    protected booleanFormControl: FormControl<boolean | null>      = new FormControl<boolean>(false);
    protected numberFormControl: FormControl<number | null>        = new FormControl<number>(0);
    protected stringFormControl: FormControl<string | null>        = new FormControl<string>('');
    protected colorFormControl: FormControl<DatumTypeColor | null> = new FormControl<DatumTypeColor>(new DatumTypeColor(DatumTypeColorBase.RGB, 255, 255, 255));
    protected timeFormControl: FormControl<DateTime | null>        = new FormControl<DateTime>(DateTime.fromJSDate(new Date()), this.validateDateTime.bind(this));
    protected dateFormControl: FormControl<DateTime | null>        = new FormControl<DateTime>(DateTime.fromJSDate(new Date()), this.validateDateTime.bind(this));

    private dateTimeTempTime: Date | null = null;
    private dateTimeTempDate: Date | null = null;

    protected calendarVisible: boolean = true;
    protected clockVisible: boolean    = true;

    protected readonly DatumType = DatumType;

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
                this.numberFormControl.valueChanges.subscribe(value => {
                    this.selectedValue = value;
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

    protected get selectedColor(): DatumTypeColor | null {
        if (this.selectedValue instanceof DatumTypeColor) {
            return this.selectedValue;
        } else {
            return null;
        }
    }

    protected confirm(): void {
        if (this.selectedValue != null) {
            this.closeDialog({successful: true, value: this.selectedValue});
        }
    }

    private validateDateTime(control: AbstractControl): ValidationErrors | null {
        if ((control as FormControl<DateTime | null>).value?.isValid !== true) {
            return {invalidDate: true};
        }
        return null;
    }

    protected readonly DatumTypeColorBase = DatumTypeColorBase;
}

export interface ConstantEditDialogData {
    type: DatumType,
    value: unknown,
    datumName?: string,
    canClear?: boolean
}

export interface ConstantEditDialogResponse {
    successful: boolean,
    value: unknown
}
