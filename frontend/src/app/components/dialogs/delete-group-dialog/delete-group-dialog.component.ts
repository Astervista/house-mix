import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from '@angular/material/dialog';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {MatError, MatFormField, MatLabel} from '@angular/material/input';
import {MatOption, MatSelect} from '@angular/material/select';
import {MatButton} from '@angular/material/button';
import {DeleteGroupChildFate, DeleteGroupOptions} from '@common/devices/group/rest-classes';
import {GroupInfo, groupsToDialogSelect} from '../change-group-dialog/change-group-dialog.component';
import {Group} from '@common/devices/group/group';

@Component({
               selector:    'house-mix-delete-group-dialog',
               imports:     [
                   MatDialogTitle,
                   MatRadioGroup,
                   ReactiveFormsModule,
                   MatRadioButton,
                   MatFormField,
                   MatLabel,
                   MatSelect,
                   MatOption,
                   MatError,
                   MatDialogActions,
                   MatDialogClose,
                   MatDialogContent,
                   MatButton
               ],
               templateUrl: './delete-group-dialog.component.html',
               styleUrl:    './delete-group-dialog.component.scss'
           })
export class DeleteGroupDialogComponent {

    protected fateResult: DeleteGroupOptions | null = null;

    protected orphanFateFormControl: FormControl<DeleteGroupChildFate | null> = new FormControl<DeleteGroupChildFate | null>(DeleteGroupChildFate.CURRENT_LEVEL, Validators.required);
    protected parentGroupFormControl: FormControl<string | null> = new FormControl<string | null>(null);

    protected formGroup : FormGroup = new FormGroup(
        {
            orphanFate: this.orphanFateFormControl,
            parentGroup: this.parentGroupFormControl
        },
        this.validateHierarchy.bind(this)
    );

    protected groups: GroupInfo[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DeleteGroupDialogData
    ) {
        this.formGroup.valueChanges.subscribe((values: { orphanFate: DeleteGroupChildFate | null, parentGroup: string | null }) => {
            if (this.data.toDelete.hasChildren) {
                if (this.formGroup.invalid) {
                    this.fateResult = null;
                } else {
                    if (values.orphanFate === DeleteGroupChildFate.CHOOSE_WHERE) {
                        if (values.parentGroup == null) {
                            this.fateResult = null;
                            return;
                        }
                        this.fateResult = {
                            fate: values.orphanFate,
                            parent: values.parentGroup
                        }
                    } else {
                        this.fateResult = {
                            fate: values.orphanFate
                        }
                    }
                }
            } else {
                this.fateResult = {
                    fate: null
                }
            }
        });
        this.groups =
            groupsToDialogSelect(data.groupNames, data.groupDisplays)
                .filter(a => a.name != this.data.toDelete.name);
        if (!this.data.toDelete.hasChildren) {
            this.fateResult = {
                fate: null
            }
        } else {
            this.fateResult = {
                fate: DeleteGroupChildFate.CURRENT_LEVEL
            }
        }
    }

    private validateHierarchy(control: AbstractControl<{ orphanFate: DeleteGroupChildFate | null, parentGroup: string | null } | null>): ValidationErrors | null {
        if (control.value == null) {
            return null;
        }
        if (control.value.orphanFate !== DeleteGroupChildFate.CHOOSE_WHERE) {
            return null;
        } else {
            if (control.value.parentGroup == null) {
                return {sonOfNoGroup: true};
            } else {
                return null;
            }
        }
    }

    protected readonly DeleteGroupChildFate = DeleteGroupChildFate;
}

export interface DeleteGroupDialogData {
    groupNames: string[];
    groupDisplays: string[];
    toDelete: Group;
}
