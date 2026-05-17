/**
 *  This module contains the {@link EntityLocationInputComponent|`EntityLocationInputComponent`} and related classes.
 *
 *  @module
 */
import {Component, Input, OnInit} from '@angular/core';
import {MatError, MatFormField, MatLabel} from '@angular/material/input';
import {MatOption} from '@angular/material/core';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {MatSelect} from '@angular/material/select';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors} from '@angular/forms';
import {GroupInfo} from '../../dialogs/change-group-dialog/change-group-dialog.component';

// noinspection ES6UnusedImports
import type {Sensor} from '@common/devices/sensor/sensor';
// noinspection ES6UnusedImports
import type {Actuator} from '@common/devices/actuator/actuator';
// noinspection ES6UnusedImports
import type {Group} from '@common/devices/group/group';

/**
 * This component can be added to a form or a dialog box and provides inputs to choose the position of
 * an entity ({@link Sensor|`Sensor`}, {@link Actuator|`Actuator`} or {@link Group|`Group`}) in the system.
 *
 * The component consists of a checkbox to select whether the entity will be put in the root or inside a group,
 * and a select field to select the parent group, only shown in the latter case.
 *
 * The values are exposed through the relative two form controls {@link EntityLocationInputComponent#topLevelFormControl|`topLevelFormControl`}
 * and {@link EntityLocationInputComponent#parentGroupFormControl|`parentGroupFormControl`}, or through the
 * {@link EntityLocationInputComponent#formGroup|`formGroup`} that groups them together.
 *
 * @component
 * @componentSelector `<house-mix-entity-location-input>`
 */
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

    /**
     * The group chosen by default when the group option is selected.
     *
     * @input
     */
    @Input() public defaultGroup: string | null = null;
    /**
     * The groups available to be chosen.
     *
     * @input
     */
    @Input() public groups: GroupInfo[]         = [];

    /** The {@link FormControl|`FormControl`} handling the checkbox switching between top-level and inside a group. */
    public topLevelFormControl: FormControl<boolean | null>   = new FormControl<boolean | null>(true);
    /** The {@link FormControl|`FormControl`} handling the chosen group. */
    public parentGroupFormControl: FormControl<string | null> = new FormControl<string | null>(null);
    /** The {@link FormGroup|`FormGroup`} handling all the values of the component. */
    public formGroup: FormGroup                               = new FormGroup({
                                                                                  topLevel:    this.topLevelFormControl,
                                                                                  parentGroup: this.parentGroupFormControl
                                                                              }, this.validateHierarchy.bind(this));

    /**
     * Implementation of {@link OnInit#ngOnInit| `OnInit.ngOnInit()`}.
     */
    public ngOnInit(): void {
        this.parentGroupFormControl.setValue(this.defaultGroup);
    }

    /**
     * The currently selected group. If `null`, the option selected is to put the entity inside the root.
     */
    public get chosenLocation(): string | null {
        return (this.topLevelFormControl.value === true) ? null : this.parentGroupFormControl.value
    }

    /**
     * Validation function for the {@link EntityLocationInputComponent#formGroup|`formGroup`}.
     *
     * @param {AbstractControl<{name: string | null, displayName: string | null, topLevel: boolean | null, parentGroup: string | null} | null>} control
     *          The {@link FormGroup|`FormGroup`} to validate.
     * @returns {ValidationErrors | null} - The results of validation. The only possible error is `sonOfNoGroup`.
     * @private
     */
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
