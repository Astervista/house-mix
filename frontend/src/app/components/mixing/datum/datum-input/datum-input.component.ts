import {Component, Input} from '@angular/core';
import {MatError, MatFormField, MatLabel, MatOption, MatSelect, MatSelectTrigger} from '@angular/material/select';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatCheckbox} from '@angular/material/checkbox';
import {DATUM_TYPE_DISPLAY, getColorVarNameForType} from '../../constants';
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

    @Input({required: false})
    public set fixNullable(value: boolean | null) {
        this._fixNullable = value;
        if (this._fixNullable != null) {
            this.nullableFormControl.setValue(this._fixNullable);
        }
    }

    public _fixNullable: boolean | null = null;

    public typeFormControl: FormControl<DatumType | null> = new FormControl<DatumType | null>(null, Validators.required);
    public nullableFormControl: FormControl<boolean | null> = new FormControl<boolean>(false);

    protected readonly Object                 = Object;
    protected readonly getColorVarNameForType = getColorVarNameForType;
    protected readonly DATUM_TYPE_DISPLAY = DATUM_TYPE_DISPLAY;
    protected readonly DatumType          = DatumType;
}
