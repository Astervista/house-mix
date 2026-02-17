import {AfterViewInit, Component, Inject, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions,  MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {Datum, DatumType} from '@common/mixing/mix/datum';
import {MatButton} from '@angular/material/button';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {DatumInputComponent} from '../../mixing/datum/datum-input/datum-input.component';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';

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

    protected result: Datum | null = null;

    @ViewChild(DatumInputComponent)
    protected inputComponent: DatumInputComponent | undefined;

    public nameFormControl: FormControl<string | null> = new FormControl<string | null>(null, Validators.required);

    constructor(
        @Inject(MAT_DIALOG_DATA) data: OutputDefineDialogData,
        dialogRef: MatDialogRef<DatumDefineDialogComponent, Datum>
    ) {
        super(data, dialogRef);
    }

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

    private updateResult(type: DatumType | null, name: string | null, nullable: boolean | null): void {
        if (type == null || name == null || this.inputComponent == null || this.nameFormControl.invalid || nullable == null) {
            this.result = null;
        } else {
            this.result = new Datum(name, type, nullable);
        }
    }

    protected get canClose(): boolean {
        return this.result != null && this.nameFormControl.valid;
    }

    protected confirm(): void {
        if (this.canClose) {
            this.closeDialog(this.result);
        }
    }

    protected readonly DatumType = DatumType;
    protected readonly Object    = Object;
}

export interface OutputDefineDialogData {
    forbiddenNames: string[];
    title?: string;
}
