import {Component, Inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from "@angular/material/dialog";
import {MatButton} from "@angular/material/button";
import {NgClass} from "@angular/common";

export interface ConfirmDialogData extends DefaultDialogData {
    warn?: boolean; // If true, show confirm button as red (warn)
}

export interface DefaultDialogData {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
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
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
    ) {}

    protected onConfirm(): void {
        this.dialogRef.close(true);
    }

    protected onCancel(): void {
        this.dialogRef.close(false);
    }
}
