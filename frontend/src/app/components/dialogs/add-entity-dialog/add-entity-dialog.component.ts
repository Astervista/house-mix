import {AfterViewInit, Component, Inject, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from '@angular/material/dialog';
import {MatButton, MatIconButton} from '@angular/material/button';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Group} from '@common/devices/group/group';
import {EntityType} from '@common/devices/constants';
import {Actuator, ActuatorType} from '@common/devices/actuator/actuator';
import {Sensor, SensorType} from '@common/devices/sensor/sensor';
import {GroupInfo, groupsToDialogSelect} from '../change-group-dialog/change-group-dialog.component';
import {EntityNamesInputsComponent} from '../../auxiliary/entity-names-inputs/entity-names-inputs.component';
import {EntityLocationInputComponent} from '../../auxiliary/entity-position-input/entity-location-input.component';
import {MatOption} from '@angular/material/core';
import {MatError, MatFormField, MatHint, MatLabel, MatSelect, MatSelectTrigger} from '@angular/material/select';
import {
    ACTUATOR_PROPERTIES_LIBRARY,
    ACTUATOR_TYPE_DISPLAY,
    ACTUATOR_TYPE_ICON,
    SENSOR_PROPERTIES_LIBRARY,
    SENSOR_TYPE_DISPLAY,
    SENSOR_TYPE_ICON
} from '../../entities/devices/device/constants';
import {Datum, ExportedDatum} from '@common/mixing/mix/datum';
import {MatIcon} from '@angular/material/icon';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';
import {DATUM_TIME_DISPLAY} from '../../mixing/constants';
import {OutputDefineDialogComponent, OutputDefineDialogData} from '../../mixing/mix/output-define-dialog/output-define-dialog.component';
import {MatInput} from '@angular/material/input';
import {ActuatorEditChanges} from "@common/devices/actuator/rest-classes"
import {SensorEditChanges} from "@common/devices/sensor/rest-classes"
import {GroupEditChanges} from "@common/devices/group/rest-classes"
import {DynamicSvgComponent} from '../../auxiliary/dynamic-svg/dynamic-svg.component';

@Component({
               selector:    'house-mix-add-entity-dialog',
               imports: [
                   MatDialogContent,
                   MatDialogActions,
                   MatDialogClose,
                   MatButton,
                   MatDialogTitle,
                   ReactiveFormsModule,
                   EntityNamesInputsComponent,
                   EntityLocationInputComponent,
                   MatOption,
                   MatSelect,
                   MatLabel,
                   MatFormField,
                   MatError,
                   MatIconButton,
                   MatIcon,
                   MatMenu,
                   MatMenuItem,
                   MatMenuTrigger,
                   MatHint,
                   MatInput,
                   DynamicSvgComponent,
                   MatSelectTrigger
               ],
               templateUrl: './add-entity-dialog.component.html',
               styleUrl:    './add-entity-dialog.component.scss'
           })
export class AddEntityDialogComponent implements AfterViewInit {

    protected groupResult: GroupInfo | null       = null;
    protected actuatorResult: ActuatorInfo | null = null;
    protected sensorResult: SensorInfo | null = null;

    @ViewChild(EntityNamesInputsComponent)
    private nameInputsComponent!: EntityNamesInputsComponent;

    @ViewChild(EntityLocationInputComponent)
    private entityLocationInputComponent?: EntityLocationInputComponent;

    protected actuatorTypeFormControl: FormControl<ActuatorType | null> = new FormControl<ActuatorType | null>(null, Validators.required);
    protected sensorTypeFormControl: FormControl<SensorType | null> = new FormControl<SensorType | null>(null, Validators.required);
    protected zigbeeAddressFormControl: FormControl<string | null>      = new FormControl<string | null>(
        null,
        [
            Validators.required,
            Validators.pattern(/^[a-f0-9A-F]+$/),
            Validators.minLength(16),
            Validators.maxLength(16)
        ]
    );

    protected formGroup: FormGroup | null = null;

    protected groups: GroupInfo[] = [];

    protected deviceExposes: Datum[] = [];

    private _exposesDirty: boolean = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: AddEntityDialogData,
        private matDialog: MatDialog
    ) {
        this.groups = groupsToDialogSelect(data.groupNames, data.groupDisplays);
        if (this.data.entityType == EntityType.ACTUATOR && this.data.edit != null) {
            this.zigbeeAddressFormControl.setValue(this.data.edit.zigbeeAddress)
            this.actuatorTypeFormControl.setValue(this.data.edit.actuatorType)
            this.deviceExposes = this.data.edit.exposes;
        }
    }

    public ngAfterViewInit(): void {
        if ((this.data.edit == null) && (this.entityLocationInputComponent != null)) {
            switch (this.data.entityType) {
                case EntityType.GROUP: {
                    this.formGroup = new FormGroup(
                        {
                            name:        this.nameInputsComponent.nameFormControl,
                            displayName: this.nameInputsComponent.displayNameFormControl,
                            location:    this.entityLocationInputComponent.formGroup
                        }
                    );
                    break;
                }
                case EntityType.ACTUATOR: {
                    this.formGroup = new FormGroup(
                        {
                            name:          this.nameInputsComponent.nameFormControl,
                            displayName:   this.nameInputsComponent.displayNameFormControl,
                            zigbeeAddress: this.zigbeeAddressFormControl,
                            actuatorType:  this.actuatorTypeFormControl,
                            location:      this.entityLocationInputComponent.formGroup
                        }
                    );
                    break;
                }
                case EntityType.SENSOR: {
                    this.formGroup = new FormGroup(
                        {
                            name:          this.nameInputsComponent.nameFormControl,
                            displayName:   this.nameInputsComponent.displayNameFormControl,
                            zigbeeAddress: this.zigbeeAddressFormControl,
                            sensorType:  this.sensorTypeFormControl,
                            location:      this.entityLocationInputComponent.formGroup
                        }
                    );
                }
            }
        } else {
            switch (this.data.entityType) {
                case EntityType.GROUP: {
                    this.formGroup = new FormGroup(
                        {
                            name:        this.nameInputsComponent.nameFormControl,
                            displayName: this.nameInputsComponent.displayNameFormControl
                        }
                    );
                    break;
                }
                case EntityType.ACTUATOR: {
                    this.formGroup = new FormGroup(
                        {
                            name:        this.nameInputsComponent.nameFormControl,
                            displayName: this.nameInputsComponent.displayNameFormControl,
                            zigbeeAddress: this.zigbeeAddressFormControl,
                            actuatorType:  this.actuatorTypeFormControl,
                        }
                    );
                    break;
                }
                case EntityType.SENSOR: {
                    this.formGroup = new FormGroup(
                        {
                            name:        this.nameInputsComponent.nameFormControl,
                            displayName: this.nameInputsComponent.displayNameFormControl,
                            zigbeeAddress: this.zigbeeAddressFormControl,
                            sensorType:  this.sensorTypeFormControl,
                        }
                    );
                    break;
                }
            }
        }
        this
            .formGroup
            .valueChanges
            .subscribe((
                           values: {
                               name: string | null,
                               displayName: string | null,
                               actuatorType: ActuatorType | null,
                               sensorType: SensorType | null,
                               zigbeeAddress: string | null
                           }) => {
                this.groupValueChanges(values);
            });
    }

    private groupValueChanges(
        values: {
            name: string | null;
            displayName: string | null;
            actuatorType: ActuatorType | null;
            sensorType: SensorType | null;
            zigbeeAddress: string | null }
    ): void {
        if (this.formGroup == null) {
            return;
        }
        switch (this.data.entityType) {
            case EntityType.GROUP: {
                if (
                    values.name == null
                    || values.displayName == null
                    || this.formGroup.invalid
                    || ((values.name == this.data.edit?.name) && (values.displayName == this.data.edit.displayName))
                ) {
                    this.groupResult = null;
                } else {
                    this.groupResult = {
                        name:        values.name,
                        displayName: values.displayName
                    };
                }
                break;
            }
            case EntityType.ACTUATOR: {
                if (
                    values.name == null
                    || values.displayName == null
                    || values.actuatorType == null
                    || values.zigbeeAddress == null
                    || this.formGroup.invalid
                    || (
                        (this.data.edit != null)
                        && (values.name == this.data.edit.name)
                        && (values.displayName == this.data.edit.displayName)
                        && (values.actuatorType == this.data.edit.actuatorType)
                        && (values.zigbeeAddress == this.data.edit.zigbeeAddress)
                        && !this.exposesDirty
                    )
                ) {
                    this.actuatorResult = null;
                } else {
                    this.actuatorResult = {
                        name:          values.name,
                        displayName:   values.displayName,
                        actuatorType:  values.actuatorType,
                        zigbeeAddress: values.zigbeeAddress
                    };
                }
                break;
            }
            case EntityType.SENSOR:{
                if (
                    values.name == null
                    || values.displayName == null
                    || values.sensorType == null
                    || values.zigbeeAddress == null
                    || this.formGroup.invalid
                    || (
                        (this.data.edit != null)
                        && (values.name == this.data.edit.name)
                        && (values.displayName == this.data.edit.displayName)
                        && (values.sensorType == this.data.edit.sensorType)
                        && (values.zigbeeAddress == this.data.edit.zigbeeAddress)
                        && !this.exposesDirty
                    )
                ) {
                    this.sensorResult = null;
                } else {
                    this.sensorResult = {
                        name:          values.name,
                        displayName:   values.displayName,
                        sensorType:  values.sensorType,
                        zigbeeAddress: values.zigbeeAddress
                    };
                }
            }
        }
    }

    private get exposesDirty(): boolean {
        return this._exposesDirty;
    }

    private set exposesDirty(value: boolean) {
        this._exposesDirty = value;
        if (this.formGroup != null) {
            this.groupValueChanges(
                this.formGroup.value as  {
                    name: string | null;
                    displayName: string | null;
                    actuatorType: ActuatorType | null;
                    sensorType: SensorType | null;
                    zigbeeAddress: string | null
                })
        }
    }

    protected get title(): string {
        switch (this.data.entityType) {
            case EntityType.GROUP: {
                return this.data.edit == null ? 'Create a new group' : 'Edit group';
            }
            case EntityType.ACTUATOR: {
                return this.data.edit == null ? 'Create a new actuator' : 'Edit actuator';
            }
            case EntityType.SENSOR: {
                return this.data.edit == null ? 'Create a new sensor' : 'Edit sensor';
            }
        }
    }

    protected get result():
        AddEntityDialogResultGroup
        | AddEntityDialogResultActuator
        | AddEntityDialogResultSensor
        | EditEntityDialogResultGroup
        | EditEntityDialogResultActuator
        | EditEntityDialogResultSensor
        | null {
        switch (this.data.entityType) {
            case EntityType.GROUP: {
                if (this.groupResult == null) {
                    return null;
                }
                if (this.data.edit == null) {
                    return {
                        type:   EntityType.GROUP,
                        group:  new Group(this.groupResult.name, this.groupResult.displayName),
                        parent: this.entityLocationInputComponent?.chosenLocation ?? null
                    };
                } else {
                    return {
                        type:   EntityType.GROUP,
                        group:  {
                            name:        this.groupResult.name != this.data.edit.name ? this.groupResult.name : undefined,
                            displayName: this.groupResult.displayName != this.data.edit.displayName ? this.groupResult.displayName : undefined
                        },
                        parent: null
                    };
                }
            }
            case EntityType.ACTUATOR: {
                if (this.actuatorResult == null) {
                    return null;
                }
                const actuatorResult = new Actuator(
                    this.actuatorResult.name,
                    this.actuatorResult.displayName,
                    this.actuatorResult.actuatorType,
                    this.actuatorResult.zigbeeAddress.toUpperCase()
                );
                actuatorResult.exposes.push(...this.deviceExposes);
                if (this.data.edit == null) {
                    return {
                        type:   EntityType.ACTUATOR,
                        actuator: actuatorResult,
                        parent:   this.entityLocationInputComponent?.chosenLocation ?? null
                    };
                } else {
                    return {
                        type:   EntityType.ACTUATOR,
                        actuator: {
                            name:          this.actuatorResult.name != this.data.edit.name ? this.actuatorResult.name : undefined,
                            displayName:   this.actuatorResult.displayName != this.data.edit.displayName ? this.actuatorResult.displayName : undefined,
                            zigbeeAddress: this.actuatorResult.zigbeeAddress != this.data.edit.zigbeeAddress ? this.actuatorResult.zigbeeAddress : undefined,
                            type:          this.actuatorResult.actuatorType != this.data.edit.actuatorType ? this.actuatorResult.actuatorType : undefined,
                            exposes:       this.exposesDirty ? this.deviceExposes : undefined
                        },
                        parent:   null
                    };
                }
            }
            case EntityType.SENSOR: {
                if (this.sensorResult == null) {
                    return null;
                }
                const sensorResult = new Sensor(
                    this.sensorResult.name,
                    this.sensorResult.displayName,
                    this.sensorResult.sensorType,
                    this.sensorResult.zigbeeAddress.toUpperCase()
                );
                sensorResult.exposes.push(...this.deviceExposes);
                if (this.data.edit == null) {
                    return {
                        type:   EntityType.SENSOR,
                        sensor: sensorResult,
                        parent:   this.entityLocationInputComponent?.chosenLocation ?? null
                    };
                } else {
                    return {
                        type:   EntityType.SENSOR,
                        sensor: {
                            name:          this.sensorResult.name != this.data.edit.name ? this.sensorResult.name : undefined,
                            displayName:   this.sensorResult.displayName != this.data.edit.displayName ? this.sensorResult.displayName : undefined,
                            zigbeeAddress: this.sensorResult.zigbeeAddress != this.data.edit.zigbeeAddress ? this.sensorResult.zigbeeAddress : undefined,
                            type:          this.sensorResult.sensorType != this.data.edit.sensorType ? this.sensorResult.sensorType : undefined,
                            exposes:       this.exposesDirty ? this.deviceExposes : undefined
                        },
                        parent:   null
                    };
                }
            }
        }
    }

    protected get confirmDisabled(): boolean {
        switch (this.data.entityType) {
            case EntityType.GROUP: {
                return this.groupResult == null;
            }
            case EntityType.ACTUATOR: {
                return this.actuatorResult == null;
            }
            case EntityType.SENSOR: {
                return this.sensorResult == null;
            }
        }
    }

    protected set deviceExposesFromLibrary(data: Datum[]) {
        this.deviceExposes = data.map(
            datum =>
                new Datum(datum.name, datum.type, datum.nullable)
        );
        this.exposesDirty = true;
    }

    protected removeDeviceExposes(datum: Datum): void {
        this.deviceExposes = this.deviceExposes.filter(d => d !== datum);
        this.exposesDirty = true;
    }

    protected addExposes(): void {

        const dialogRef =
                  this
                      .matDialog
                      .open<OutputDefineDialogComponent, OutputDefineDialogData, ExportedDatum>(
                          OutputDefineDialogComponent,
                          {
                              data: {
                                  forbiddenNames: this.deviceExposes.map(input => input.name),
                                  title:          'Define a new property'
                              }
                          }
                      );
        dialogRef
            .afterClosed()
            .subscribe(selectedDatum => {
                if (selectedDatum == null) {
                    return;
                }
                this.deviceExposes.push(selectedDatum);
                this.exposesDirty = true;
            });
    }

    protected readonly ActuatorType                = ActuatorType;
    protected readonly Object                      = Object;
    protected readonly EntityType   = EntityType;
    protected readonly ACTUATOR_TYPE_DISPLAY       = ACTUATOR_TYPE_DISPLAY;
    protected readonly ACTUATOR_TYPE_ICON          = ACTUATOR_TYPE_ICON;
    protected readonly Datum                       = Datum;
    protected readonly ACTUATOR_PROPERTIES_LIBRARY = ACTUATOR_PROPERTIES_LIBRARY;
    protected readonly DATUM_TIME_DISPLAY          = DATUM_TIME_DISPLAY;

    protected readonly SensorType       = SensorType;
    protected readonly SENSOR_TYPE_ICON    = SENSOR_TYPE_ICON;
    protected readonly SENSOR_TYPE_DISPLAY       = SENSOR_TYPE_DISPLAY;
    protected readonly SENSOR_PROPERTIES_LIBRARY = SENSOR_PROPERTIES_LIBRARY;
}

export type AddEntityDialogData = {
    entityType: EntityType.GROUP
    groupNames: string[]
    groupDisplays: string[]
    forbiddenNames: string[]
    sonOfGroup: string | null
    edit?: {
        name: string;
        displayName: string;
    };
} | {
    entityType: EntityType.ACTUATOR;
    groupNames: string[];
    groupDisplays: string[];
    forbiddenNames: string[];
    sonOfGroup: string | null;
    edit?: {
        name: string;
        displayName: string;
        zigbeeAddress: string;
        actuatorType: ActuatorType;
        exposes: Datum[];
    };
}| {
    entityType: EntityType.SENSOR;
    groupNames: string[];
    groupDisplays: string[];
    forbiddenNames: string[];
    sonOfGroup: string | null;
    edit?: {
        name: string;
        displayName: string;
        zigbeeAddress: string;
        sensorType: SensorType;
        exposes: Datum[];
    };
}

export interface AddEntityDialogResultGroup {
    type: EntityType.GROUP;
    group: Group;
    parent: string | null;
}

export interface AddEntityDialogResultActuator {
    type: EntityType.ACTUATOR;
    actuator: Actuator;
    parent: string | null;
}

export interface AddEntityDialogResultSensor {
    type: EntityType.SENSOR;
    sensor: Sensor;
    parent: string | null;
}

export interface EditEntityDialogResultGroup {
    type: EntityType.GROUP;
    group: GroupEditChanges;
    parent: string | null;
}

export interface EditEntityDialogResultActuator {
    type: EntityType.ACTUATOR;
    actuator: ActuatorEditChanges;
    parent: string | null;
}

export interface EditEntityDialogResultSensor {
    type: EntityType.SENSOR;
    sensor: SensorEditChanges;
    parent: string | null;
}

export interface ActuatorInfo {
    name: string,
    displayName: string,
    actuatorType: ActuatorType,
    zigbeeAddress: string,
}

export interface SensorInfo {
    name: string,
    displayName: string,
    sensorType: SensorType,
    zigbeeAddress: string,
}
