/**
 *  This module contains the {@link EntityNamesInputsComponent|`EntityNamesInputsComponent`} and related classes.
 *
 *  @module
 */
import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {UNIQUE_NAME_PATTERN} from '@common/utils/constants';

/**
 * This component can be added to a form or a dialog box and provides two commonly used text fields
 * for the input of a display name and a codename.
 *
 * The text fields are already set up with validation.
 * - The codename text field (reachable through {@link EntityNamesInputsComponent#nameFormControl|`nameFormControl`})
 *   is validated against the {@link UNIQUE_NAME_PATTERN|`UNIQUE_NAME_PATTERN`} common to every codename.
 *   It is also checked that the name is not one of the {@link EntityNamesInputsComponent#forbiddenNames|`forbiddenNames`}.
 * - The display name text field (reachable through {@link EntityNamesInputsComponent#displayNameFormControl|`displayNameFormControl`})
 *   is validated such that it contains at least one non-whitespace character.
 *
 * @component
 * @componentSelector `<house-mix-entity-names-inputs>`
 */
@Component({
               selector:    'house-mix-entity-names-inputs',
               imports:     [
                   MatFormField,
                   MatLabel,
                   MatInput,
                   ReactiveFormsModule,
                   MatError,
                   MatHint
               ],
               templateUrl: './entity-names-inputs.component.html',
               styleUrl:    './entity-names-inputs.component.scss'
           })
export class EntityNamesInputsComponent implements OnInit {

    /**
     *  The previous value for the codename, assigned to the form control at component instantiation.
     * `null` or not set for no initial value.
     *
     * @input
     */
    @Input() public originalName: string | null        = null;
    /**
     * The previous value for the display name, assigned to the form control at component instantiation.
     * `null` or not set for no initial value.
     *
     * @input
     */
    @Input() public originalDisplayName: string | null = null;
    /**
     *  A list of codenames that cannot be used (e.g., because they are already taken).
     *
     * @input
     */
    @Input() public forbiddenNames: string[]           = [];
    /**
     * Whether the two text fields should be displayed horizontally. Defaults to `false`.
     *
     * @hostBinding class.horizontal
     * @input
     */
    @HostBinding("class.horizontal")
    @Input() public horizontal: boolean = false;
    /**
     * The hint text to display under the codename input field. `null` or not se to hide it.
     *
     * @input
     */
    @Input() public nameHint: string | null = null;
    /**
     * The hint text to display under the display name input field. `null` or not se to hide it.
     *
     * @input
     */
    @Input() public displayNameHint: string | null = null;

    /** The {@link FormControl|`FormControl`} handling the codename input field. */
    public nameFormControl: FormControl<string | null>        = new FormControl<string | null>(
        null,
        [
            Validators.required,
            Validators.pattern(UNIQUE_NAME_PATTERN),
            this.validateName.bind(this)
        ]
    );
    /** The {@link FormControl|`FormControl`} handling the display name input field. */
    public displayNameFormControl: FormControl<string | null> = new FormControl<string | null>(
        null,
        [
            Validators.required,
            Validators.pattern(/^.*\S.*$/)
        ]
    );

    /**
     * Implementation of {@link OnInit#ngOnInit| `OnInit.ngOnInit()`}.
     */
    public ngOnInit(): void {
        this.nameFormControl.setValue(this.originalName);
        this.displayNameFormControl.setValue(this.originalDisplayName);
    }

    /**
     * Validation function for the {@link EntityNamesInputsComponent#nameFormControl|`nameFormControl`} (codename input field),
     * checking if the chosen name is forbidden.
     *
     * @param {AbstractControl<string | null>} control - The {@link FormControl|`FormControl`} to validate.
     * @returns {ValidationErrors | null} - The results of the validation. The only possible error is `forbiddenName`.
     */
    private validateName(control: AbstractControl<string | null>): ValidationErrors | null {
        const forbidden = this.forbiddenNames.includes(control.value ?? '') && (this.originalName == null || control.value !== this.originalName);
        return forbidden ? {forbiddenName: true} : null;
    };
}
