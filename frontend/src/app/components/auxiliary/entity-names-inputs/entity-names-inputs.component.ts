import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';

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

    @Input() public originalName: string | null        = null;
    @Input() public originalDisplayName: string | null = null;
    @Input() public forbiddenNames: string[]           = [];
    @HostBinding("class.horizontal")
    @Input() public horizontal: boolean = false;

    public nameFormControl: FormControl<string | null>        = new FormControl<string | null>(
        null,
        [
            Validators.required,
            Validators.pattern(/^[a-z\-0-9_]+$/),
            this.validateName.bind(this)
        ]
    );
    public displayNameFormControl: FormControl<string | null> = new FormControl<string | null>(
        null,
        [
            Validators.required,
            Validators.pattern(/^.*\S.*$/)
        ]
    );

    public ngOnInit(): void {
        this.nameFormControl.setValue(this.originalName);
        this.displayNameFormControl.setValue(this.originalDisplayName);
    }

    private validateName(control: AbstractControl<string | null>): ValidationErrors | null {
        const forbidden = this.forbiddenNames.includes(control.value ?? '') && (this.originalName == null || control.value !== this.originalName);
        return forbidden ? {forbiddenName: true} : null;
    };
}
