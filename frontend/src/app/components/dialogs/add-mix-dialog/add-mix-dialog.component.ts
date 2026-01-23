import {Component, Inject} from '@angular/core';
import {MatDialogComponent} from '../../../utils/better-mat-dialog';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {DynamicSvgComponent} from '../../auxiliary/dynamic-svg/dynamic-svg.component';

@Component({
               selector:    'house-mix-add-mix-dialog',
               imports:     [
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   DynamicSvgComponent
               ],
               templateUrl: './add-mix-dialog.component.html',
               styleUrl:    './add-mix-dialog.component.scss'
           })
export class AddMixDialogComponent extends MatDialogComponent<AddMixInfo | null, AddMixInfo> {

    private _selectedPhase: MixPhase   = MixPhase.SENSORS;
    private _selectedTarget: MixTarget = MixTarget.DEVICE;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: AddMixInfo,
        dialogRef: MatDialogRef<AddMixDialogComponent, AddMixInfo>
    ) {
        super(data, dialogRef);
    }

    public get selectedPhase(): MixPhase {
        return this._selectedPhase;
    }

    public set selectedPhase(phase: MixPhase) {
        switch (phase) {
            case MixPhase.ACTUATORS:
            case MixPhase.SENSORS: {
                if (this._selectedTarget == MixTarget.CENTER) {
                    this._selectedTarget = MixTarget.DEVICE;
                }
                break;
            }
            case MixPhase.CENTER: {
                this._selectedTarget = MixTarget.CENTER;
                break;
            }
        }
        this._selectedPhase = phase;
    }

    public get selectedTarget(): MixTarget {
        return this._selectedTarget;
    }

    public set selectedTarget(target: MixTarget) {
        switch (target) {
            case MixTarget.GROUP:
            case MixTarget.DEVICE:
                if (this._selectedPhase != MixPhase.CENTER) {
                    this._selectedTarget = target;
                }
                break;
            case MixTarget.CENTER:
                if (this._selectedPhase == MixPhase.CENTER) {
                    this._selectedTarget = target;
                }
                break;
        }
    }

    protected confirm(): void {
    }

    protected readonly MixPhase  = MixPhase;
    protected readonly MixTarget = MixTarget;
}

export enum MixPhase {
    SENSORS   = 'SENSORS',
    CENTER    = 'CENTER',
    ACTUATORS = 'ACTUATORS'
}

export enum MixTarget {
    DEVICE = 'DEVICE',
    GROUP  = 'GROUP',
    CENTER = 'CENTER',
}

export type AddMixInfo = AddMixInfoSensors | AddMixInfoCenter | AddMixInfoActuators;

export type AddMixInfoSensors = AddMixInfoSensorsDevice | AddMixInfoSensorsGroup;

export interface AddMixInfoCenter {
    phase: MixPhase.CENTER,
    target: MixTarget.CENTER
}

export type AddMixInfoActuators = AddMixInfoActuatorsDevice | AddMixInfoActuatorsGroup;

export interface AddMixInfoSensorsDevice {
    phase: MixPhase.SENSORS,
    target: MixTarget.DEVICE,
    sensorName: string
}

export interface AddMixInfoSensorsGroup {
    phase: MixPhase.SENSORS,
    target: MixTarget.GROUP,
    groupName: string
}

export interface AddMixInfoActuatorsDevice {
    phase: MixPhase.ACTUATORS,
    target: MixTarget.DEVICE,
    actuatorName: string
}

export interface AddMixInfoActuatorsGroup {
    phase: MixPhase.ACTUATORS,
    target: MixTarget.GROUP,
    groupName: string
}
