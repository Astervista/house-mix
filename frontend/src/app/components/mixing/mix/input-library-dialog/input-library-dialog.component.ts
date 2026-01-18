import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {ExportedDatum} from '@common/mixing/mix/datum';

@Component({
  selector: 'house-mix-input-library-dialog',
               imports: [
                   MatDialogContent,
                   MatDialogActions,
                   MatDialogTitle,
                   MatButton,
                   MatDialogClose
               ],
  templateUrl: './input-library-dialog.component.html',
  styleUrl: './input-library-dialog.component.scss'
})
export class InputLibraryDialogComponent {

    protected selectedExport: ExportedDatum | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected availableExports: ExportedDatum[],
    ) {

    }

}
