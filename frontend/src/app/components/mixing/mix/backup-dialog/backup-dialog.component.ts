/**
 *  This module contains the {@link BackupDialogComponent|`BackupDialogComponent`} and related classes.
 *
 *  @module
 */
import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatDialogComponent} from '../../../../utils/better-mat-dialog';
import {MixBackup, MixBackups} from '../mix.component';
import {MatButton, MatIconButton} from '@angular/material/button';
import {DatePipe} from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import {MixPhase, MixTarget} from '@common/mixing/mix/rest-classes';
import {LocalStorageObject, LocalStorageService} from '../../../../services/local-storage.service';

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';

/**
 * A dialog that shows previous saved versions of a {@link Mix|`Mix`} and lets the user
 * select one to open or delete the unwanted ones.
 *
 * @component
 * @componentSelector `<house-mix-backup-dialog>`
 */
@Component({
               selector:    'house-mix-backup-dialog',
               imports:     [
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   MatButton,
                   DatePipe,
                   MatIcon,
                   MatIconButton
               ],
               templateUrl: './backup-dialog.component.html',
               styleUrl:    './backup-dialog.component.scss'
           })
export class BackupDialogComponent extends MatDialogComponent<MixBackups, MixBackup> {

    /** The {@link MixBackup|`MixBackup`} currently being edited in the editor. */
    protected selected: MixBackup | null = null;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {MixBackups} backups - The available backups to be shown. The dialog input.
     * @param {MatDialogRef<BackupDialogComponent, MixBackup>} dialogRef - The dialog reference.
     * @param {LocalStorageService} localStorageService - The local storage service. Instantiated by dependency injection.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) backups: MixBackups,
        dialogRef: MatDialogRef<BackupDialogComponent, MixBackup>,
        private localStorageService: LocalStorageService
    ) {
        super(backups, dialogRef);
    }

    /**
     * Delete a specific {@link MixBackup|`MixBackup`} from the memory.
     *
     * @param {MixBackup} backup - The backup to delete.
     */
    protected deleteBackup(backup: MixBackup): void {
        if (backup == this.selected) {
            this.selected = null;
        }
        this.data.removeBackup(backup);
        if (!this.data.hasBackups) {
            this.localStorageService.removeItem(new LocalStorageObject<MixBackups | null>(
                `mix-save.${this.data.mixId}`,
                null
            ));
        } else {
            this.localStorageService.setItem(
                new LocalStorageObject<MixBackups | null>(
                    `mix-save.${this.data.mixId}`,
                    this.data
                ),
                this.data,
                MixBackups.toJSON
            );
        }
    }

    /** @ignore */
    protected readonly MixPhase  = MixPhase;
    /** @ignore */
    protected readonly MixTarget = MixTarget;

}

