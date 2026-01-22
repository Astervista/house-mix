import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions,  MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {ExportedDatum} from '@common/mixing/mix/datum';
import {MatDialogComponent} from '../../../../utils/better-mat-dialog';

@Component({
  selector: 'house-mix-input-library-dialog',
               imports: [
                   MatDialogContent,
                   MatDialogActions,
                   MatDialogTitle,
                   MatButton
               ],
  templateUrl: './input-library-dialog.component.html',
  styleUrl: './input-library-dialog.component.scss'
})
export class InputLibraryDialogComponent extends MatDialogComponent<ExportedDatum[], ExportedDatum>{

    protected selectedExport: ExportedDatum | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA)  availableExports: ExportedDatum[],
         dialogRef: MatDialogRef<InputLibraryDialogComponent, ExportedDatum>
    ) {
        super(availableExports, dialogRef)
    }

}
