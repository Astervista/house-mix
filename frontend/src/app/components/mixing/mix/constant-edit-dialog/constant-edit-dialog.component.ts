import {Component, Inject} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from '@angular/material/dialog';
import {Datum, DatumType} from '@common/mixing/mix/datum';
import {MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatTimepicker, MatTimepickerInput, MatTimepickerToggle} from '@angular/material/timepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatIcon} from '@angular/material/icon';
import {provideLuxonDateAdapter} from '@angular/material-luxon-adapter';
import {DateTime} from 'luxon';

export const DATE_FORMAT = {
    parse: {
        dateInput: 'yyyy-MM-dd',
        timeInput: 'HH:mm:ss',
    },
    display: {
        dateInput: 'yyyy-MM-dd',
        monthYearLabel: 'MMM yyyy',
        dateA11yLabel: 'yyyy-MM-dd',
        monthYearA11yLabel: 'MMMM yyyy',
        timeOptionLabel: 'HH:mm:ss',
        timeInput: 'HH:mm:ss',
    },
};

@Component({
  selector: 'house-mix-constant-edit-dialog',
               imports: [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   MatDialogClose,
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
                   MatIcon
               ],
               providers: [
                   // Luxon can be provided globally to your app by adding `provideLuxonDateAdapter`
                   // to your app config. We provide it at the component level here, due to limitations
                   // of our example generation script.
                   provideLuxonDateAdapter(DATE_FORMAT),
               ],
  templateUrl: './constant-edit-dialog.component.html',
  styleUrl: './constant-edit-dialog.component.scss'
})
export class ConstantEditDialogComponent {

    constructor(
        @Inject(MAT_DIALOG_DATA) protected data: ConstantEditDialogData,
    ) {
        switch (data.type) {
            case DatumType.NUMBER: {
                const number = (data.value as number | null) ?? Datum.getDefaultForType(data.type) as number;
                this.selectedValue = number;
                this.numberFormControl.setValue(number);
                this.numberFormControl.valueChanges.subscribe(value => {
                    this.selectedValue = value;
                })
                break;
            }
            case DatumType.BOOLEAN: { throw new Error('Boolean is not implemented') }
            case DatumType.TIME: {
                const date =data.value == null ? new Date() : new Date(data.value as Date);
                this.selectedValue = date;
                this.timeFormControl.setValue(DateTime.fromJSDate(date));
                this.timeFormControl.valueChanges.subscribe(value => {
                    this.selectedValue = value?.toJSDate();
                })
                break;
            }
            case DatumType.DATE: {
                const date =data.value == null ? new Date() : new Date(data.value as Date);
                this.selectedValue = date;
                this.dateFormControl.setValue( DateTime.fromJSDate(date));
                this.dateFormControl.valueChanges.subscribe((value: DateTime | null) => {
                    if (value == null) {
                        this.selectedValue = null;
                        return;
                    }
                    this.selectedValue = value.toJSDate();
                })
                break;
            }
            case DatumType.DATE_TIME: {

                this.dateTimeTempDate = data.value == null ? new Date() : new Date(data.value as Date);
                this.dateTimeTempTime = data.value == null ? new Date() : new Date(data.value as Date);

                this.selectedValue =  new Date(
                    this.dateTimeTempDate.getFullYear(),
                    this.dateTimeTempDate.getMonth(),
                    this.dateTimeTempDate.getDate(),
                    this.dateTimeTempTime.getHours(),
                    this.dateTimeTempTime.getMinutes(),
                    this.dateTimeTempTime.getSeconds()
                )

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
                })

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
                })
                break;
            }
        }
    }

    protected selectedValue: unknown = null;

    protected numberFormControl: FormControl<number | null> = new FormControl<number>(0);
    protected timeFormControl: FormControl<DateTime | null> = new FormControl<DateTime>(DateTime.fromJSDate(new Date()));
    protected dateFormControl: FormControl<DateTime | null> = new FormControl<DateTime>(DateTime.fromJSDate(new Date()));

    private dateTimeTempTime: Date | null = null;
    private dateTimeTempDate: Date | null = null;

    protected readonly DatumType = DatumType;

    protected getTitle(): string {
        switch (this.data.type) {
            case DatumType.NUMBER: {
                return 'Change numerical value';
            }
            case DatumType.BOOLEAN: {
                return 'Change boolean value';
            }
            case DatumType.TIME: {
                return 'Change time';
            }
            case DatumType.DATE: {
                return 'Select date';
            }
            case DatumType.DATE_TIME: {
                return 'Change date and time';
            }
        }
    }
}

export interface ConstantEditDialogData {
    type: DatumType,
    value: unknown
}

export interface ConstantEditDialogResponse {
    successful: boolean,
    value: unknown
}
