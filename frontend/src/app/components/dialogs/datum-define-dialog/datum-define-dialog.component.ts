/**
 *  This module contains the {@link DatumDefineDialogComponent|`DatumDefineDialogComponent`} and related classes.
 *
 *  @module
 */
import {AfterViewInit, Component, Inject, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {Datum, DatumType} from '@common/mixing/mix/datum';
import {MatButton} from '@angular/material/button';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {DatumInputComponent} from '../../mixing/datum/datum-input/datum-input.component';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';

// noinspection ES6UnusedImports
import type {MatDialog} from '@angular/material/dialog';

/**
 * A dialog for creating a {@link Datum|`Datum`}.
 *
 * @see {@link OutputDefineDialogData|`OutputDefineDialogData`} - The input data.
 * @see {@link Datum|`Datum`} - The result data.
 * @component
 * @componentSelector `<house-mix-output-define-dialog>`
 */
@Component({
               selector:    'house-mix-output-define-dialog',
               imports: [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,

                   ReactiveFormsModule,
                   DatumInputComponent,
                   MatFormField,
                   MatHint,
                   MatInput,
                   MatLabel,
                   MatError,
                   InputReturnBehaviorDirective
               ],
               templateUrl: './datum-define-dialog.component.html',
               styleUrl:    './datum-define-dialog.component.scss'
           })
export class DatumDefineDialogComponent extends MatDialogComponent<OutputDefineDialogData, Datum> implements AfterViewInit {

    /** The current result value. `null` if the dialog data is invalid. */
    protected result: Datum | null = null;

    /**
     * The component containing the inputs for {@link Datum#type|`type`} and {@link Datum#nullable|`nullable`}.
     *
     * @viewChild {@link DatumInputComponent|`DatumInputComponent`}
     */
    @ViewChild(DatumInputComponent)
    protected inputComponent: DatumInputComponent | undefined;

    /** The {@link FormControl|`FormControl`} handling the {@link Datum#name|`name`} input field. */
    public nameFormControl: FormControl<string | null> = new FormControl<string | null>(null, Validators.required);


    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {OutputDefineDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<DatumDefineDialogComponent, Datum>} dialogRef - The dialog reference.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: OutputDefineDialogData,
        dialogRef: MatDialogRef<DatumDefineDialogComponent, Datum>
    ) {
        super(data, dialogRef);
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
    public ngAfterViewInit(): void {
        if (this.inputComponent != null) {
            const typeFormControl     = this.inputComponent.typeFormControl;
            const nameFormControl     = this.nameFormControl;
            const nullableFormControl = this.inputComponent.nullableFormControl;
            nameFormControl.addValidators((control: AbstractControl<string | null>): ValidationErrors | null => {
                if (control.value == null || control.value == '') {
                    return {required: true};
                }
                const forbidden = this.data.forbiddenNames.includes(control.value);
                return forbidden ? {forbiddenName: true} : null;
            });
            nameFormControl.valueChanges.subscribe(value => {
                this.updateResult(typeFormControl.value, value, nullableFormControl.value);
            });
            typeFormControl.valueChanges.subscribe(value => {
                this.updateResult(value, nameFormControl.value, nullableFormControl.value);
            });
            nullableFormControl.valueChanges.subscribe(value => {
                this.updateResult(typeFormControl.value, nameFormControl.value, value);
            });
        }
    }

    /**
     * Updates {@link DatumDefineDialogComponent#result|`result`} with new values.
     * Sets it to `null` if any of the parameters is `null`.
     *
     * @param {DatumType | null} type - The new {@link Datum#type|`type`} value. `null` for invalid.
     * @param {string | null} name  - The new {@link Datum#name|`name`} value. `null` for invalid.
     * @param {boolean | null} nullable - The new {@link Datum#nullable|`nullable`} value. `null` for invalid.
     */
    private updateResult(type: DatumType | null, name: string | null, nullable: boolean | null): void {
        if (type == null || name == null || this.inputComponent == null || this.nameFormControl.invalid || nullable == null) {
            this.result = null;
        } else {
            this.result = new Datum(name, type, nullable);
        }
    }

    /**
     * Whether the dialog is valid and can be successfully closed.
     */
    protected get canClose(): boolean {
        return this.result != null && this.nameFormControl.valid;
    }

    /**
     * If the data entered in the dialog is valid, closes the dialog with the currently inserted data
     * as a return value.
     */
    protected confirm(): void {
        if (this.canClose) {
            this.closeDialog(this.result);
        }
    }

    /** @ignore */
    protected readonly DatumType = DatumType;
    /** @ignore */
    protected readonly Object    = Object;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using {@link DatumDefineDialogComponent|`DatumDefineDialogComponent`}.
 */
export interface OutputDefineDialogData {
    /** The names that can't be used for {@link Datum#name|`name`}. */
    forbiddenNames: string[];
    /** The title of the dialog. */
    title?: string;
    /**
     * A preset value for  {@link Datum#nullable|`nullable`}. If not defined, the user
     * can choose the nullability condition. If `true` or `false`, the result will be
     * set with the respective value, and the user will not see the input for it.
     */
    fixNullable?: boolean;
}
