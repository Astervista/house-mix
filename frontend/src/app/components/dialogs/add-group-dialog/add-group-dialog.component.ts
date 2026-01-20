import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {Group} from '@common/devices/group/group';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {MatOption, MatSelect} from '@angular/material/select';
import {GroupInfo, groupsToDialogSelect} from '../change-group-dialog/change-group-dialog.component';

@Component({
               selector:    'house-mix-add-group-dialog',
               imports:     [
                   MatDialogContent,
                   MatDialogActions,
                   MatDialogClose,
                   MatButton,
                   MatDialogTitle,
                   MatLabel,
                   ReactiveFormsModule,
                   MatFormField,
                   MatInput,
                   MatHint,
                   MatError,
                   MatRadioGroup,
                   MatRadioButton,
                   MatSelect,
                   MatOption
               ],
               templateUrl: './add-group-dialog.component.html',
               styleUrl:    './add-group-dialog.component.scss'
           })
export class AddGroupDialogComponent {

    protected result: GroupInfo | null = null;

    protected nameFormControl: FormControl<string | null>        = new FormControl<string | null>(
        this.data.edit?.name ?? null,
        [
            Validators.required,
            Validators.pattern(/^[a-z\-0-9_]+$/),
            this.validateName.bind(this)
        ]
    );
    protected displayNameFormControl: FormControl<string | null> = new FormControl<string | null>(
        this.data.edit?.displayName ?? null,
        [
            Validators.required,
            Validators.pattern(/^.*\S.*$/)
        ]
    );
    protected topLevelFormControl: FormControl<boolean | null>   = new FormControl<boolean | null>(true);
    protected parentGroupFormControl: FormControl<string | null> = new FormControl<string | null>(this.data.sonOfGroup);
    protected formGroup: FormGroup                               = new FormGroup(
        {
            name:        this.nameFormControl,
            displayName: this.displayNameFormControl,
            topLevel:    this.topLevelFormControl,
            parentGroup: this.parentGroupFormControl
        },
        this.validateHierarchy.bind(this)
    );

    protected groups: GroupInfo[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: AddGroupDialogData
    ) {
        this
            .formGroup
            .valueChanges
            .subscribe((values: { name: string | null, displayName: string | null }) => {
                if (
                    values.name == null
                    || values.displayName == null
                    || this.formGroup.invalid
                    || ((values.name == this.data.edit?.name) && (values.displayName == this.data.edit.displayName))
                ) {
                    this.result = null;
                } else {
                    this.result = {
                        name:        values.name,
                        displayName: values.displayName
                    };
                }
            });
        this.groups = groupsToDialogSelect(data.groupNames, data.groupDisplays);
    }

    private validateName(control: AbstractControl<string | null>): ValidationErrors | null {
        const forbidden = this.data.groupNames.includes(control.value ?? '') && (this.data.edit == null || control.value !== this.data.edit.name);
        return forbidden ? {forbiddenName: true} : null;
    };

    private validateHierarchy(control: AbstractControl<{ name: string | null, displayName: string | null, topLevel: boolean | null, parentGroup: string | null } | null>): ValidationErrors | null {
        if (control.value == null) {
            return null;
        }
        if (this.data.edit == null) {
            if (control.value.topLevel === true) {
                return null;
            } else {
                if (control.value.parentGroup == null) {
                    return {sonOfNoGroup: true};
                } else {
                    return null;
                }
            }
        } else {
            return null;
        }
    }

    protected createResult(result: GroupInfo | null): AddGroupDialogResult | null {
        if (result == null) {
            return result;
        }
        return {
            group: new Group(result.name, result.displayName),
            parent: this.data.edit == null ? (this.topLevelFormControl.value === true) ? null : this.parentGroupFormControl.value : null
        };
    }
}

export interface AddGroupDialogData {
    groupNames: string[];
    groupDisplays: string[];
    sonOfGroup: string | null;
    edit?: {
        name: string;
        displayName: string;
    }
}

export interface AddGroupDialogResult {
    group: Group;
    parent: string | null;
}

