/**
 *  This module contains the {@link DatumInputComponent|`DatumInputComponent`} and related classes.
 *
 *  @module
 */
import {Component, Input} from '@angular/core';
import {MatError, MatFormField, MatLabel, MatOption, MatSelect, MatSelectTrigger} from '@angular/material/select';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatCheckbox} from '@angular/material/checkbox';
import {DATUM_TYPE_DISPLAY, getColorVarNameForType} from '../../constants';
import {DatumType} from '@common/mixing/mix/datum';

// noinspection ES6UnusedImports
import type {Datum} from '@common/mixing/mix/datum';

/**
 * This component offers inputs to set up a {@link Datum|`Datum`}.
 *
 * @component
 * @componentSelector `<house-mix-datum-input>`
 */
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

    /**
     * If set, the {@link Datum#nullable|`nullable`} value will be preset to this passed value and not modifiable.
     *
     * @input
     */
    @Input({required: false})
    public set fixNullable(value: boolean) {
        this._fixNullable = value;
        this.nullableFormControl.setValue(this._fixNullable);
    }


    /** If set, the {@link Datum#nullable|`nullable`} value will be preset to this passed value and not modifiable. */
    public _fixNullable: boolean | null = null;

    /** {@link FormControl|`FormControl`} for the {@link Datum#type|`type`} {@link MatSelect|`MatSelect`}. */
    public typeFormControl: FormControl<DatumType | null> = new FormControl<DatumType | null>(null, Validators.required);
    /** {@link FormControl|`FormControl`} for the {@link Datum#nullable|`nullable`} {@link MatCheckbox|`MatCheckbox`}. */
    public nullableFormControl: FormControl<boolean | null> = new FormControl<boolean>(false);

    /** @ignore */
    protected readonly Object                 = Object;
    /** @ignore */
    protected readonly getColorVarNameForType = getColorVarNameForType;
    /** @ignore */
    protected readonly DATUM_TYPE_DISPLAY = DATUM_TYPE_DISPLAY;
    /** @ignore */
    protected readonly DatumType          = DatumType;

}
