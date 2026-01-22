import {Injectable} from '@angular/core';
import {MatDialog, MatDialogConfig, MatDialogRef} from '@angular/material/dialog';
import {ComponentType} from '@angular/cdk/portal';

@Injectable({
                providedIn: 'root'
            })
export class BetterMatDialog {

    constructor(
        private matDialog: MatDialog
    ) {}

    public open<D, R>(component: ComponentType<MatDialogComponent<D, R>>, config: MatDialogConfig<D>): MatDialogRef<MatDialogComponent<D, R>, R> {
        return this.matDialog.open<MatDialogComponent<D, R>, D, R>(component, config);
    }
}

export class MatDialogComponent<DATA, RETURN> {

    constructor(
        protected data: DATA,
        private dialogRef: MatDialogRef<MatDialogComponent<DATA, RETURN>, RETURN>
    ) {

    }

    protected closeDialog(result?: RETURN | null): void {
        this.dialogRef.close(result ?? undefined);
    }

}
