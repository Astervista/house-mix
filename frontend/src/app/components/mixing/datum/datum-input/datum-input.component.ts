import {Component, Inject, Input} from '@angular/core';
import {MatError, MatFormField, MatHint, MatLabel, MatOption, MatSelect, MatSelectTrigger} from '@angular/material/select';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {MatInput} from '@angular/material/input';
import {MatCheckbox} from '@angular/material/checkbox';
import {DATUM_TYPE_DISPLAY, getColorVarNameForType} from '../../constants';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {OutputDefineDialogData} from '../../../dialogs/datum-define-dialog/datum-define-dialog.component';
import {DatumType} from '@common/mixing/mix/datum';


@Component({
  selector: 'house-mix-datum-input',
               imports: [
                   MatSelect,
                   MatLabel,
                   MatFormField,
                   MatOption,
                   ReactiveFormsModule,
                   MatCheckbox,
                   MatError,
                   MatSelectTrigger
               ],
  templateUrl: './datum-input.component.html',
  styleUrl: './datum-input.component.scss'
})
export class DatumInputComponent {

    public typeFormControl: FormControl<DatumType | null> = new FormControl<DatumType | null>(null, Validators.required);
    public nullableFormControl: FormControl<boolean | null> = new FormControl<boolean>(false);

    protected readonly Object                 = Object;
    protected readonly getColorVarNameForType = getColorVarNameForType;
    protected readonly DATUM_TYPE_DISPLAY = DATUM_TYPE_DISPLAY;
    protected readonly DatumType          = DatumType;
}
