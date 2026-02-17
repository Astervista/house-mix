import {AfterViewInit, Component, Inject, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {DatumInputComponent} from '../../mixing/datum/datum-input/datum-input.component';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {SystemParameter} from '@common/system/parameter/system-parameter';
import {EntityNamesInputsComponent} from '../../auxiliary/entity-names-inputs/entity-names-inputs.component';
import {FormGroup} from '@angular/forms';
import {Datum, DatumType} from '@common/mixing/mix/datum';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';


@Component({
               selector:    'house-mix-system-parameter-dialog',
               imports: [
                   MatDialogContent,
                   MatDialogActions,
                   MatButton,
                   MatDialogTitle,
                   DatumInputComponent,
                   EntityNamesInputsComponent,
                   InputReturnBehaviorDirective
               ],
               templateUrl: './system-parameter-dialog.component.html',
               styleUrl:    './system-parameter-dialog.component.scss'
           })
export class SystemParameterDialogComponent extends MatDialogComponent<SystemParameterDialogData, SystemParameter> implements AfterViewInit {

    @ViewChild(EntityNamesInputsComponent)
    private nameInputsComponent?: EntityNamesInputsComponent;

    @ViewChild(DatumInputComponent)
    private datumInputComponent?: DatumInputComponent;

    protected formGroup?: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: SystemParameterDialogData,
        dialogRef: MatDialogRef<SystemParameterDialogComponent, SystemParameter>
    ) {
        super(data, dialogRef);
    }

    public ngAfterViewInit(): void {
        if (this.nameInputsComponent != null && this.datumInputComponent != null) {
            this.formGroup = new FormGroup(
                {
                    name:        this.nameInputsComponent.nameFormControl,
                    displayName: this.nameInputsComponent.displayNameFormControl,
                    datumType:   this.datumInputComponent.typeFormControl,
                    nullable:    this.datumInputComponent.nullableFormControl
                }
            );
        }
    }

    protected confirm(): void {
        if (this.formGroup?.valid == true) {
            const value = this.formGroup.value as {
                name: string
                displayName: string
                datumType: DatumType
                nullable: boolean
            };
            const datum = new Datum(value.name, value.datumType, value.nullable);
            this.closeDialog(new SystemParameter(
                value.displayName,
                datum,
                Datum.getDefaultForType(datum.type)
            ));
        }
    }
}

export interface SystemParameterDialogData {
    forbiddenNames: string[];
}


