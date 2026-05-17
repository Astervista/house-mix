/**
 *  This module contains the {@link SystemParameterDialogComponent|`SystemParameterDialogComponent`} and related classes.
 *
 *  @module
 */
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


// noinspection ES6UnusedImports
import type {MatDialog} from '@angular/material/dialog';

/**
 * A dialog for creating and editing a {@link SystemParameter|`SystemParameter`}.
 *
 * @see {@link SystemParameterDialogData|`SystemParameterDialogData`} - The input data.
 * @see {@link SystemParameter|`SystemParameter`} - The result data.
 * @component
 * @componentSelector `<house-mix-system-parameter-dialog>`
 */
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

    /**
     * The component where the names to use for the {@link SystemParameter|`SystemParameter`} are entered.
     *
     * @viewChild {@link EntityNamesInputsComponent|`EntityNamesInputsComponent`}
     */
    @ViewChild(EntityNamesInputsComponent)
    private nameInputsComponent?: EntityNamesInputsComponent;

    /**
     * The component where the {@link Datum|`Datum`} describing the {@link SystemParameter|`SystemParameter`} is customized.
     *
     * @viewChild {@link DatumInputComponent|`DatumInputComponent`}
     */
    @ViewChild(DatumInputComponent)
    private datumInputComponent?: DatumInputComponent;

    /** The {@link FormGroup|`FormGroup`} handling all the controls in this dialog. */
    protected formGroup?: FormGroup;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {SystemParameterDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<SystemParameterDialogComponent, SystemParameter>} dialogRef - The dialog reference.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: SystemParameterDialogData,
        dialogRef: MatDialogRef<SystemParameterDialogComponent, SystemParameter>
    ) {
        super(data, dialogRef);
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
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

    /**
     * If the data entered in the dialog is valid, closes the dialog with the currently inserted data
     * as a return value.
     */
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

/**
 * Input data to a {@link MatDialog|`MatDialog`} using {@link SystemParameterDialogData|`SystemParameterDialogData`}.
 */
export interface SystemParameterDialogData {
    /** The names that can't be used for {@link SystemParameter#name|`SystemParameter.name`}. */
    forbiddenNames: string[];
}


