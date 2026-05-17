/**
 *  This module contains the {@link ConfirmDialogComponent|`ConfirmDialogComponent`} and related classes.
 *
 *  @module
 */
import {Component, Inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from "@angular/material/dialog";
import {MatButton} from "@angular/material/button";
import {NgClass} from "@angular/common";
import {MatDialogComponent} from '../../../utils/better-mat-dialog';

// noinspection ES6UnusedImports
import type {MatDialog} from '@angular/material/dialog';

/**
 * Input data to a {@link MatDialog|`MatDialog`} using {@link ConfirmDialogComponent|`ConfirmDialogComponent`}.
 */
export interface ConfirmDialogData extends DefaultDialogData {
    /** If true, show the confirm button as red (warning for delicate operations). */
    warn?: boolean;
}

/**
 * Generic input data to pass to a {@link MatDialog|`MatDialog`}, customizing
 * basic elements of the dialog.
 */
export interface DefaultDialogData {
    /** A custom title for the dialog. */
    title?: string;
    /** A custom message or text content for the dialog. */
    message?: string;
    /** The text to display in the dialog's confirm button. */
    confirmText?: string;
    /** The text to display in the dialog's cancel button. */
    cancelText?: string | null;
}


/**
 * A simple dialog that asks the user for confirmation. Editable in the title, message and buttons,
 * and returns `true` if the user clicked on the confirm button, `false` if the dialog gets
 * dismissed every other way.
 *
 * @see {@link ConfirmDialogData|`ConfirmDialogData`} - The input data.
 * @component
 * @componentSelector `<house-mix-confirm-dialog>`
 */
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

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ConfirmDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<ConfirmDialogComponent, boolean>} dialogRef - The dialog reference.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: ConfirmDialogData,
        dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>
    ) {
        super(data, dialogRef);
    }

}
