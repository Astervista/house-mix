import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from '@angular/material/dialog';
import {Datum, DatumType} from '@common/mixing/mix/datum';
import {MatButton} from '@angular/material/button';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors} from '@angular/forms';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatOption, MatSelect} from '@angular/material/select';
import {DatumTypeDisplay, getColorVarNameForType} from '../../constants';
import {MatCheckbox} from '@angular/material/checkbox';
import {JsonPipe} from '@angular/common';

@Component({
  selector: 'house-mix-output-define-dialog',
               imports: [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   MatDialogClose,
                   ReactiveFormsModule,
                   MatLabel,
                   MatFormField,
                   MatSelect,
                   MatOption,
                   MatInput,
                   MatCheckbox
               ],
  templateUrl: './output-define-dialog.component.html',
  styleUrl: './output-define-dialog.component.scss'
})
export class OutputDefineDialogComponent {

    protected result: Datum | null = null;

    protected typeFormControl: FormControl<DatumType | null> = new FormControl<DatumType | null>(null);
    protected nameFormControl: FormControl<string | null> = new FormControl<string | null>(null);
    protected nullableFormControl: FormControl<boolean | null> = new FormControl<boolean>(false);

    constructor(
        @Inject(MAT_DIALOG_DATA) public forbiddenNames: string[]
    ) {
        this.typeFormControl.valueChanges.subscribe(value => {
                this.updateResult(value, this.nameFormControl.value, this.nullableFormControl.value);
        })
        this.nameFormControl.valueChanges.subscribe(value => {
            this.updateResult(this.typeFormControl.value, value, this.nullableFormControl.value);
        })
        this.nameFormControl.addValidators((control: AbstractControl<string | null>): ValidationErrors | null => {
            if (control.value == null || control.value == "") {
                return {required: true}
            }
            const forbidden = this.forbiddenNames.includes(control.value);
            return forbidden ? {forbiddenName: true} : null;
        })
        this.nullableFormControl.valueChanges.subscribe(value => {
            this.updateResult(this.typeFormControl.value, this.nameFormControl.value, value);
        })
    }

    private updateResult(type: DatumType | null, name: string | null, nullable: boolean | null): void {
        if (type == null || name == null || this.nameFormControl.invalid || nullable == null) {
            this.result = null;
        } else {
            this.result = new Datum(name, type, nullable);
        }
    }

    protected readonly DatumType = DatumType;
    protected readonly Object           = Object;
    protected readonly DatumTypeDisplay       = DatumTypeDisplay;
    protected readonly getColorVarNameForType = getColorVarNameForType;
}
