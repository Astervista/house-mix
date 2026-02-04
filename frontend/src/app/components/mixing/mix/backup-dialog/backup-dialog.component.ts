import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatDialogComponent} from '../../../../utils/better-mat-dialog';
import {MixBackup, MixBackups} from '../mix.component';
import {MatButton, MatIconButton} from '@angular/material/button';
import {DatePipe} from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import {MixPhase, MixTarget} from '@common/mixing/mix/rest-classes';
import {LocalStorageObject, LocalStorageService} from '../../../../services/local-storage.service';


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

    protected selected: MixBackup | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) backups: MixBackups,
        dialogRef: MatDialogRef<BackupDialogComponent, MixBackup>,
        private localStorageService: LocalStorageService
    ) {
        super(backups, dialogRef);
    }

    protected deleteBackup(backup: MixBackup): void {
        if (backup == this.selected) {
            this.selected = null;
        }
        this.data.removeBackup(backup);
        if (!this.data.hasBackups) {
            this.localStorageService.removeItem(`mix-save.${this.data.mixId}`);
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

    protected readonly MixPhase  = MixPhase;
    protected readonly MixTarget = MixTarget;

}

