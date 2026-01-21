import {Component, Input, OnInit} from '@angular/core';
import {MatError, MatFormField, MatLabel} from '@angular/material/input';
import {MatOption} from '@angular/material/core';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {MatSelect} from '@angular/material/select';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors} from '@angular/forms';
import {GroupInfo} from '../../dialogs/change-group-dialog/change-group-dialog.component';

@Component({
               selector:    'house-mix-entity-location-input',
               imports:     [
                   MatError,
                   MatFormField,
                   MatLabel,
                   MatOption,
                   MatRadioButton,
                   MatRadioGroup,
                   MatSelect,
                   ReactiveFormsModule
               ],
               templateUrl: './entity-location-input.component.html',
               styleUrl:    './entity-location-input.component.scss'
           })
export class EntityLocationInputComponent implements OnInit {

    @Input() public defaultGroup: string | null = null;
    @Input() public groups: GroupInfo[]         = [];

    public topLevelFormControl: FormControl<boolean | null>   = new FormControl<boolean | null>(true);
    public parentGroupFormControl: FormControl<string | null> = new FormControl<string | null>(null);
    public formGroup: FormGroup                               = new FormGroup({
                                                                                  topLevel:    this.topLevelFormControl,
                                                                                  parentGroup: this.parentGroupFormControl
                                                                              }, this.validateHierarchy.bind(this));

    public ngOnInit(): void {
        this.parentGroupFormControl.setValue(this.defaultGroup);
    }

    public get chosenLocation(): string | null {
        return (this.topLevelFormControl.value === true) ? null : this.parentGroupFormControl.value
    }

    private validateHierarchy(control: AbstractControl<{
        name: string | null,
        displayName: string | null,
        topLevel: boolean | null,
        parentGroup: string | null
    } | null>): ValidationErrors | null {
        if (control.value == null) {
            return null;
        }
        if (control.value.topLevel === true) {
            return null;
        } else {
            if ((control.value.parentGroup == null) || !this.groups.some(otherGroup => otherGroup.name === control.value?.parentGroup)) {
                return {sonOfNoGroup: true};
            } else {
                return null;
            }
        }
    }

}
