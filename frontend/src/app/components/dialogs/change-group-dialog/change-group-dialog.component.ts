import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {MatFormField, MatLabel} from '@angular/material/input';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';
import {FormControl, ReactiveFormsModule} from '@angular/forms';

@Component({
               selector:    'house-mix-change-group-dialog',
               imports:     [
                   MatDialogContent,
                   MatDialogActions,
                   MatDialogClose,
                   MatButton,
                   MatDialogTitle,
                   MatFormField,
                   MatLabel,
                   MatOption,
                   MatSelect,
                   ReactiveFormsModule
               ],
               templateUrl: './change-group-dialog.component.html',
               styleUrl:    './change-group-dialog.component.scss'
           })
export class ChangeGroupDialogComponent {

    protected parentGroupFormControl: FormControl<string | null | TopmostResult> = new FormControl<string | null | TopmostResult>(this.data.sonOfGroup ?? TOPMOST);

    protected groups: GroupInfo[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ChangeGroupDialogData
    ) {
        this.groups =
            groupsToDialogSelect(data.groupNames, data.groupDisplays)
                .filter(a => a.name != this.data.self);
    }

    protected readonly TOPMOST = TOPMOST;

}

export interface TopmostResult {
    topmost: true
}

export const TOPMOST: TopmostResult = {
    topmost: true
}

export interface GroupInfo {
    name: string,
    displayName: string
}

export interface ChangeGroupDialogData {
    groupNames: string[];
    groupDisplays: string[];
    sonOfGroup: string | null;
    self: string;
}

export function groupsToDialogSelect(groupNames: string[], groupDisplays: string[]): GroupInfo[] {
    return groupDisplays
        .map((displayName, index): Partial<GroupInfo> => {
            return {
                name:        groupNames[index],
                displayName: displayName
            };
        })
        .filter(
            (a: Partial<GroupInfo>): a is GroupInfo => {
                return a.name != undefined && a.displayName != undefined;
            }
        )
        .sort(
            (a, b) =>
                a.displayName.localeCompare(b.displayName)
        );
}
