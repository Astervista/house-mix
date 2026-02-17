import {Component, Inject} from '@angular/core';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {DefaultDialogData} from '../confirm-dialog/confirm-dialog.component';
import {MatButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';

export type StringInputDialogData = DefaultDialogData & {
    defaultValue?: string;
    inputLabel?: string;
    hint?: string;
}

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

    protected stringFormControl: FormControl<string | null> = new FormControl<string | null>(null, Validators.required);

    constructor(
        @Inject(MAT_DIALOG_DATA) data: StringInputDialogData,
        dialogRef: MatDialogRef<StringInputDialogComponent, string>
    ) {
        super(data, dialogRef);
        if (data.defaultValue != null) {
            this.stringFormControl.setValue(data.defaultValue);
        }
    }

    protected confirm(): void {
        if (this.stringFormControl.valid) {
            this.closeDialog(this.stringFormControl.value);
        }
    }

}
