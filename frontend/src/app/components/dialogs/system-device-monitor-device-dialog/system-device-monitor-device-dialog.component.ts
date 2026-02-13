import {AfterViewInit, Component, Inject} from '@angular/core';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {MatButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors} from '@angular/forms';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';


@Component({
               selector:    'house-mix-system-device-monitor-device-dialog',
               imports:     [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   ReactiveFormsModule,
                   MatFormField,
                   MatLabel,
                   MatInput,
                   MatHint,
                   MatError
               ],
               templateUrl: './system-device-monitor-device-dialog.component.html',
               styleUrl:    './system-device-monitor-device-dialog.component.scss'
           })
export class SystemDeviceMonitorDeviceDialogComponent extends MatDialogComponent<SystemDeviceMonitorDeviceDialogData, DeviceMonitorDevice> implements AfterViewInit {

    protected nameFormControl: FormControl<string | null> = new FormControl<string | null>(null);
    protected ipFormControl: FormControl<string | null>   = new FormControl<string | null>(null);

    constructor(
        @Inject(MAT_DIALOG_DATA) data: SystemDeviceMonitorDeviceDialogData,
        dialogRef: MatDialogRef<SystemDeviceMonitorDeviceDialogComponent, DeviceMonitorDevice>
    ) {
        super(data, dialogRef);
    }

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

    protected confirm(): void {
        if (this.nameFormControl.invalid || this.ipFormControl.invalid) {
            return;
        }
        if (this.nameFormControl.value != null) {
            this.closeDialog(new DeviceMonitorDevice(this.ipFormControl.value ?? undefined, this.nameFormControl.value, null));
        }
    }

}


export interface SystemDeviceMonitorDeviceDialogData {
    forbiddenNames: string[];
    edit?: DeviceMonitorDevice;
}

