/**
 *  This module contains the {@link SystemDeviceMonitorDeviceDialogComponent|`SystemDeviceMonitorDeviceDialogComponent`} and related classes.
 *
 *  @module
 */
import {AfterViewInit, Component, Inject} from '@angular/core';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {MatButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors} from '@angular/forms';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';

// noinspection ES6UnusedImports
import type {MatDialog} from '@angular/material/dialog';

/**
 * A dialog for creating and editing a {@link DeviceMonitorDevice|`DeviceMonitorDevice`}.
 *
 * @see {@link SystemDeviceMonitorDeviceDialogData|`SystemDeviceMonitorDeviceDialogData`} - The input data.
 * @see {@link DeviceMonitorDevice|`DeviceMonitorDevice`} - The result data.
 * @component
 * @componentSelector `<house-mix-system-device-monitor-device-dialog>`
 */
@Component({
               selector:    'house-mix-system-device-monitor-device-dialog',
               imports: [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   ReactiveFormsModule,
                   MatFormField,
                   MatLabel,
                   MatInput,
                   MatHint,
                   MatError,
                   InputReturnBehaviorDirective
               ],
               templateUrl: './system-device-monitor-device-dialog.component.html',
               styleUrl:    './system-device-monitor-device-dialog.component.scss'
           })
export class SystemDeviceMonitorDeviceDialogComponent extends MatDialogComponent<SystemDeviceMonitorDeviceDialogData, DeviceMonitorDevice> implements AfterViewInit {

    /** The {@link FormControl|`FormControl`} handling the input field for {@link DeviceMonitorDevice#name|`DeviceMonitorDevice.name`}. */
    protected nameFormControl: FormControl<string | null> = new FormControl<string | null>(null);
    /** The {@link FormControl|`FormControl`} handling the input field for {@link DeviceMonitorDevice#ip|`DeviceMonitorDevice.ipip`}. */
    protected ipFormControl: FormControl<string | null>   = new FormControl<string | null>(null);

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {SystemDeviceMonitorDeviceDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<SystemDeviceMonitorDeviceDialogComponent, DeviceMonitorDevice>} dialogRef - The dialog reference.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: SystemDeviceMonitorDeviceDialogData,
        dialogRef: MatDialogRef<SystemDeviceMonitorDeviceDialogComponent, DeviceMonitorDevice>
    ) {
        super(data, dialogRef);
        if (data.edit != null) {
            this.nameFormControl.disable();
        }
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
    public ngAfterViewInit(): void {
        this.nameFormControl.addValidators((control: AbstractControl<string | null>): ValidationErrors | null => {
            if (control.value == null || control.value == '') {
                return {required: true};
            }
            if (this.data.forbiddenNames.includes(control.value)) {
                return {
                    forbiddenName: true
                };
            } else {
                return null;
            }
        });
        this.ipFormControl.addValidators((control: AbstractControl<string | null>): ValidationErrors | null => {
            if (control.value == null || control.value == '') {
                return {required: true};
            }
            const split = control.value.split('.');
            if (split.length != 4) {
                return {
                    invalidIp: true
                };
            }
            for (const piece of split) {
                if (!/^[1-9]\d*$/.test(piece)) {
                    return {
                        invalidIp: true
                    };
                }
            }
            return null;
        });
        if (this.data.edit != null) {
            this.nameFormControl.setValue(this.data.edit.name);
            this.ipFormControl.setValue(this.data.edit.ip ?? null);
        }
    }

    /**
     * If the data entered in the dialog is valid, closes the dialog with the currently inserted data
     * as a return value.
     */
    protected confirm(): void {
        if (this.nameFormControl.invalid || this.ipFormControl.invalid) {
            return;
        }
        if (this.nameFormControl.value != null) {
            this.closeDialog(new DeviceMonitorDevice(this.ipFormControl.value ?? undefined, this.nameFormControl.value, null));
        }
    }

}


/**
 * Input data to a {@link MatDialog|`MatDialog`} using {@link SystemDeviceMonitorDeviceDialogData|`SystemDeviceMonitorDeviceDialogData`}.
 */
export interface SystemDeviceMonitorDeviceDialogData {
    /** The names that can't be used for {@link DeviceMonitorDevice#name|`DeviceMonitorDevice.name`}. */
    forbiddenNames: string[];
    /** The {@link DeviceMonitorDevice|`DeviceMonitorDevice`} to be edited. If not defined, the dialog operates in creation mode. */
    edit?: DeviceMonitorDevice;
}

