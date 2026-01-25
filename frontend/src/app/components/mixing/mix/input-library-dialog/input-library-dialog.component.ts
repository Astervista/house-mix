import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {Datum, DatumOrigin, ExportedDatum} from '@common/mixing/mix/datum';
import {MatDialogComponent} from '../../../../utils/better-mat-dialog';
import {MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from '@angular/material/expansion';
import {DATUM_ORIGIN_DISPLAY, DATUM_TYPE_DISPLAY, getColorVarNameForType, getExternalDatumOriginNameDisplay} from '../../constants';
import {SYSTEM_ORIGIN_DISPLAY} from '../../../system/constants';
import {MatTooltip} from '@angular/material/tooltip';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';

@Component({
               selector:    'house-mix-input-library-dialog',
               imports:     [
                   MatDialogContent,
                   MatDialogActions,
                   MatDialogTitle,
                   MatButton,
                   MatExpansionPanel,
                   MatAccordion,
                   MatExpansionPanelHeader,
                   MatExpansionPanelTitle,
                   MatTooltip
               ],
               templateUrl: './input-library-dialog.component.html',
               styleUrl:    './input-library-dialog.component.scss'
           })
export class InputLibraryDialogComponent extends MatDialogComponent<ExportedDatum[], ExportedDatum> {

    protected selectedInput: ExportedDatum | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) availableInputs: ExportedDatum[],
        dialogRef: MatDialogRef<InputLibraryDialogComponent, ExportedDatum>
    ) {
        super(availableInputs, dialogRef);
    }

    protected readonly Datum       = Datum;
    protected readonly DatumOrigin = DatumOrigin;
    protected readonly Object      = Object;

    protected getInputsFromOrigin(origin: DatumOrigin): ExportedDatum[] {
        return this.data.filter(datum => datum.origin == origin);
    }

    protected readonly DATUM_TYPE_DISPLAY     = DATUM_TYPE_DISPLAY;
    protected readonly getColorVarNameForType = getColorVarNameForType;
    protected readonly SYSTEM_ORIGIN_DISPLAY  = SYSTEM_ORIGIN_DISPLAY;

    protected readonly TOOLTIP_TIMEOUT               = TOOLTIP_TIMEOUT;
    protected readonly DATUM_ORIGIN_DISPLAY          = DATUM_ORIGIN_DISPLAY;
    protected readonly getExternalDatumOriginDisplay = getExternalDatumOriginNameDisplay;
}
