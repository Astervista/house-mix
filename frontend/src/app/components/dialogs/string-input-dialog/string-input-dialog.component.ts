/**
 *  This module contains the {@link StringInputDialogComponent|`StringInputDialogComponent`} and related classes.
 *
 *  @module
 */
import {Component, Inject} from '@angular/core';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {DefaultDialogData} from '../confirm-dialog/confirm-dialog.component';
import {MatButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';

// noinspection ES6UnusedImports
import type {MatDialog} from '@angular/material/dialog';

/**
 * Input data to a {@link MatDialog|`MatDialog`} using {@link StringInputDialogComponent|`StringInputDialogComponent`}.
 */
export interface StringInputDialogData extends DefaultDialogData {
    /** The default value to prefill the input with. Not defined will not prefill. */
    defaultValue?: string;
    /** The label for the input. Not define defaults to "Value". */
    inputLabel?: string;
    /** The hint for the input. Not defined means no hint will be shown. */
    hint?: string;
}


/**
 * A simple dialog that asks the user for a string. Returns the string entered by the user
 * if the user clicked on the confirm button, `undefined` if the dialog gets
 * dismissed every other way.
 *
 * @see {@link StringInputDialogData|`StringInputDialogData`} - The input data.
 *
 * @component
 * @componentSelector `<house-mix-string-input-dialog>`
 */
@Component({
               selector:    'house-mix-string-input-dialog',
               imports: [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   MatFormField,
                   MatLabel,
                   MatHint,
                   ReactiveFormsModule,
                   MatInput,
                   MatError,
                   InputReturnBehaviorDirective
               ],
               templateUrl: './string-input-dialog.component.html',
               styleUrl:    './string-input-dialog.component.scss'
           })
export class StringInputDialogComponent extends MatDialogComponent<StringInputDialogData, string> {

    /** The {@link FormControl|`FormControl`} handling the input field. */
    protected stringFormControl: FormControl<string | null> = new FormControl<string | null>(null, Validators.required);

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {StringInputDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<StringInputDialogComponent, string>} dialogRef - The dialog reference.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: StringInputDialogData,
        dialogRef: MatDialogRef<StringInputDialogComponent, string>
    ) {
        super(data, dialogRef);
        if (data.defaultValue != null) {
            this.stringFormControl.setValue(data.defaultValue);
        }
    }

    /**
     * If the input is valid, closes the dialog with the currently inserted string
     * as a return value.
     */
    protected confirm(): void {
        if (this.stringFormControl.valid) {
            this.closeDialog(this.stringFormControl.value);
        }
    }

}
