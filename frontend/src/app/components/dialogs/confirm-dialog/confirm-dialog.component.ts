import {Component, Inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from "@angular/material/dialog";
import {MatButton} from "@angular/material/button";
import {NgClass} from "@angular/common";
import {MatDialogComponent} from '../../../utils/better-mat-dialog';

export interface ConfirmDialogData extends DefaultDialogData {
    warn?: boolean; // If true, show the confirm button as red (warn)
}

export interface DefaultDialogData {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string | null;
}

@Component({
               selector:    "house-mix-confirm-dialog",
               templateUrl: "./confirm-dialog.component.html",
               imports:     [
                   MatDialogActions,
                   MatButton,
                   MatDialogContent,
                   MatDialogTitle,
                   NgClass
               ],
               styleUrls:   ["./confirm-dialog.component.scss"]
           })
export class ConfirmDialogComponent extends MatDialogComponent<ConfirmDialogData, boolean>{
    constructor(
        @Inject(MAT_DIALOG_DATA) data: ConfirmDialogData,
        dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>
    ) {
        super(data, dialogRef);
    }

}
