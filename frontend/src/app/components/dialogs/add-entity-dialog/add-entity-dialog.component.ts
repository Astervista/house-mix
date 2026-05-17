/**
 *  This module contains the {@link AddEntityDialogComponent|`AddEntityDialogComponent`} and related classes.
 *
 *  @module
 */
import {AfterViewInit, Component, Inject, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
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
    ACTUATOR_TYPE_ICON, DeviceLibraryProperty,
    SENSOR_PROPERTIES_LIBRARY,
    SENSOR_TYPE_DISPLAY,
    SENSOR_TYPE_ICON
} from '../../entities/devices/device/constants';
import {Datum} from '@common/mixing/mix/datum';
import {MatIcon} from '@angular/material/icon';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';
import {DATUM_TYPE_DISPLAY} from '../../mixing/constants';
import {MatInput} from '@angular/material/input';
import {ActuatorEditChanges} from '@common/devices/actuator/rest-classes';
import {SensorEditChanges} from '@common/devices/sensor/rest-classes';
import {GroupEditChanges} from '@common/devices/group/rest-classes';
import {DynamicSvgComponent} from '../../auxiliary/dynamic-svg/dynamic-svg.component';
import {DatumDefineDialogComponent} from '../datum-define-dialog/datum-define-dialog.component';
import {BetterMatDialog, MatDialogComponent} from '../../../utils/better-mat-dialog';
import {LoadingStatus} from '../../../utils/enums';
import {LoadingScrimComponent} from '../../auxiliary/loading-scrim/loading-scrim.component';
import {DeviceService} from '../../../services/device.service';
import {LockedExposes} from '@common/devices/rest-classes';
import {MixPhase, MixPositionInfo, MixTarget} from '@common/mixing/mix/rest-classes';
import {InputReturnBehaviorDirective} from '../../../directives/input-return-behavior/input-return-behavior.directive';
import {MatTooltip} from '@angular/material/tooltip';
import {TOOLTIP_TIMEOUT} from '../../../utils/constants';

// noinspection ES6UnusedImports
import type {MatDialog} from '@angular/material/dialog';
// noinspection ES6UnusedImports
import type {Device} from '@common/devices/device';
// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';

/**
 * Values emitted from the {@link FormGroup#valueChanges|`FormGroup.valueChanges`} of
 * {@link AddEntityDialogComponent#formGroup|`formGroup`}.
 *
 * @notExported
 */
interface GroupValueChanges {
    /** A unique name. */
    name: string | null;
    /** A display name to identify an entity in the UI. */
    displayName: string | null;
    /** An actuator type of an entity, if applicable. */
    actuatorType: ActuatorType | null;
    /** A sensor type of an entity, if applicable. */
    sensorType: SensorType | null;
    /** An address on the zigbee network. */
    zigbeeAddress: string | null;
}

/**
 * A dialog for creating and editing a {@link Sensor|`Sensor`},
 * {@link Actuator|`Actuator`} or {@link Group|`Group`}.
 *
 * The dialog provides an input for each property of the entity, and an additional
 * {@link EntityLocationInputComponent|`<house-mix-entity-location-input>`} during
 * creation for choosing the location of the entity.
 *
 * @see {@link AddEntityDialogData|`AddEntityDialogData`} - The input data.
 * @see {@link AddEntityDialogResult|`AddEntityDialogResult`} - The result data.
 *
 * @component
 * @componentSelector `<house-mix-add-entity-dialog>`
 */
@Component({
               selector:    'house-mix-add-entity-dialog',
               imports: [
                   MatDialogContent,
                   MatDialogActions,

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
                   MatSelectTrigger,
                   LoadingScrimComponent,
                   InputReturnBehaviorDirective,
                   MatTooltip
               ],
               templateUrl: './add-entity-dialog.component.html',
               styleUrl:    './add-entity-dialog.component.scss'
           })
export class AddEntityDialogComponent extends MatDialogComponent<AddEntityDialogData, AddEntityDialogResult> implements AfterViewInit {

    /** Variable to hold the current state of the result, if the {@link EntityType|`EntityType`} is {@link EntityType.GROUP|`EntityType.GROUP`}. */
    protected groupResult: GroupInfo | null       = null;
    /** Variable to hold the current state of the result, if the {@link EntityType|`EntityType`} is {@link EntityType.ACTUATOR|`EntityType.ACTUATOR`}. */
    protected actuatorResult: ActuatorInfo | null = null;
    /** Variable to hold the current state of the result, if the {@link EntityType|`EntityType`} is {@link EntityType.SENSOR|`EntityType.SENSOR`}. */
    protected sensorResult: SensorInfo | null     = null;

    /**
     * The component handling the `name` and `displayName` of the entity.
     *
     * @viewChild {@link EntityNamesInputsComponent|`EntityNamesInputsComponent`}
     */
    @ViewChild(EntityNamesInputsComponent)
    private nameInputsComponent!: EntityNamesInputsComponent;

    /**
     * The component handling the location where the entity will be put.
     *
     * @viewChild {@link EntityLocationInputComponent|`EntityLocationInputComponent`}
     */
    @ViewChild(EntityLocationInputComponent)
    private entityLocationInputComponent?: EntityLocationInputComponent;

    /** The {@link FormControl|`FormControl`} handling the {@link Actuator#type|`Actuator type`} input field. */
    protected actuatorTypeFormControl: FormControl<ActuatorType | null> = new FormControl<ActuatorType | null>(null, Validators.required);
    /** The {@link FormControl|`FormControl`} handling the {@link Sensor#type|`Sensor type`} input field. */
    protected sensorTypeFormControl: FormControl<SensorType | null>     = new FormControl<SensorType | null>(null, Validators.required);
    /** The {@link FormControl|`FormControl`} handling the zigbee address input field. Validates it for 16 hex digits. */
    protected zigbeeAddressFormControl: FormControl<string | null>      = new FormControl<string | null>(
        null,
        [
            Validators.required,
            Validators.pattern(/^[a-f0-9A-F]+$/),
            Validators.minLength(16),
            Validators.maxLength(16)
        ]
    );

    /** The {@link FormGroup|`FormGroup`} handling all the controls in this dialog. */
    protected formGroup: FormGroup | null = null;

    /** The groups to show in the parent selection. */
    protected groups: GroupInfo[] = [];

    /**
     * The list of {@link Device#exposes|`exposes`} chosen for this entity, if the {@link EntityType|`EntityType`}
     * is {@link EntityType.ACTUATOR|`EntityType.ACTUATOR`} or {@link EntityType.SENSOR|`EntityType.SENSOR`}.
     */
    protected deviceExposes: Datum[] = [];

    /**
     * Whether the {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`} has been changed from
     * the initial value passed to the dialog.
     */
    private _exposesDirty: boolean = false;

    /** The {@link LoadingStatus|`LoadingStatus`} of the request loading {@link AddEntityDialogComponent#lockedExposes|`lockedExposes`}. */
    protected lockedExposesLoadingStatus: LoadingStatus = LoadingStatus.LOADING;
    /** The {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`} that can't be removed because used in some {@link Mix|`Mix`}. */
    protected lockedExposes: LockedExposes[]            = [];
    /** The {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`} that was attempted to be removed but failed because it's {@link AddEntityDialogComponent#lockedExposes|locked}. */
    protected errorDatum: Datum | null                  = null;
    /** The dependencies that prevent {@link AddEntityDialogComponent#errorDatum|`errorDatum`} from being removed. */
    protected errorDatumDependencies: MixPositionInfo[] = [];

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {AddEntityDialogData} data - The initial configuration of the dialog.
     * @param {MatDialogRef<AddEntityDialogComponent, AddEntityDialogResult>} matDialogRef - The dialog reference.
     * @param {BetterMatDialog} matDialog - The dialog service. Instantiated by dependency injection.
     * @param {DeviceService} deviceService - The {@link Device|`Device`} service. Instantiated by dependency injection.
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) data: AddEntityDialogData,
        matDialogRef: MatDialogRef<AddEntityDialogComponent, AddEntityDialogResult>,
        private matDialog: BetterMatDialog,
        deviceService: DeviceService
    ) {
        super(data, matDialogRef);
        this.groups = groupsToDialogSelect(data.groupNames, data.groupDisplays);
        if (this.data.entityType == EntityType.ACTUATOR && this.data.edit != null) {
            this.zigbeeAddressFormControl.setValue(this.data.edit.zigbeeAddress);
            this.actuatorTypeFormControl.setValue(this.data.edit.actuatorType);
            this.deviceExposes = this.data.edit.exposes;
        }
        if (this.data.entityType == EntityType.SENSOR && this.data.edit != null) {
            this.zigbeeAddressFormControl.setValue(this.data.edit.zigbeeAddress);
            this.sensorTypeFormControl.setValue(this.data.edit.sensorType);
            this.deviceExposes = this.data.edit.exposes;
        }
        if (data.edit != null && data.entityType == EntityType.SENSOR && this.lockedExposesLoadingStatus != LoadingStatus.LOADED) {
            deviceService
                .getLockedSensorExposes({name: data.edit.name})
                .then((result) => {
                    this.lockedExposes              = result;
                    this.lockedExposesLoadingStatus = LoadingStatus.LOADED;
                })
                .catch(() => {
                    this.lockedExposesLoadingStatus = LoadingStatus.ERROR;
                });
        }
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
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
                            sensorType:    this.sensorTypeFormControl,
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
                            name:          this.nameInputsComponent.nameFormControl,
                            displayName:   this.nameInputsComponent.displayNameFormControl,
                            zigbeeAddress: this.zigbeeAddressFormControl,
                            actuatorType:  this.actuatorTypeFormControl
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
                            sensorType:    this.sensorTypeFormControl
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

    /**
     * This function gets called every on {@link FormGroup#valueChanges|`FormGroup.valueChanges`} of
     * {@link AddEntityDialogComponent#formGroup|`formGroup`}.
     * It will align {@link AddEntityDialogComponent#groupResult|`groupResult`},
     * {@link AddEntityDialogComponent#actuatorResult|`actuatorResult`} or {@link AddEntityDialogComponent#sensorResult|`sensorResult`}
     * according to the new values stored in the {@link FormGroup|`FormGroup`}.
     *
     * @param {GroupValueChanges} values - The values from the {@link FormGroup|`FormGroup`}.
     */
    private groupValueChanges(
        values: GroupValueChanges
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
                        (values.name == this.data.edit?.name)
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
            case EntityType.SENSOR: {
                if (
                    values.name == null
                    || values.displayName == null
                    || values.sensorType == null
                    || values.zigbeeAddress == null
                    || this.formGroup.invalid
                    || (
                        (values.name == this.data.edit?.name)
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
                        sensorType:    values.sensorType,
                        zigbeeAddress: values.zigbeeAddress
                    };
                }
            }
        }
    }

    /**
     * Whether the {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`} has been changed from
     * the initial value passed to the dialog.
     */
    private get exposesDirty(): boolean {
        return this._exposesDirty;
    }

    /**
     * Change the {@link AddEntityDialogComponent#exposesDirty|`dirty status`} of
     * {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`}, updating
     * the result {@link AddEntityDialogComponent#formGroup|`formGroup`} if
     * necessary.
     */
    private set exposesDirty(value: boolean) {
        this._exposesDirty = value;
        if (this.formGroup != null) {
            this.groupValueChanges(
                this.formGroup.value as GroupValueChanges);
        }
    }

    /**
     * Get the correct dialog title based on the {@link AddEntityDialogComponent#data|`data`}
     * passed to it.
     *
     * @returns {string} - The appropriate title for this dialog.
     */
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


    /**
     * Get the correct name input hint based on the {@link AddEntityDialogComponent#data|`data`}
     * passed to it.
     *
     * @returns {string} - The appropriate hint for the name input.
     */
    protected get nameInputHint(): string {
        switch (this.data.entityType) {
            case EntityType.GROUP: {
                return 'A unique codename for the group';
            }
            case EntityType.ACTUATOR: {
                return 'A unique codename for the actuator';
            }
            case EntityType.SENSOR: {
                return 'A unique codename for the sensor';
            }
        }
    }

    /**
     * Get the correct display name input hint based on the {@link AddEntityDialogComponent#data|`data`}
     * passed to it.
     *
     * @returns {string} - The appropriate hint for the display name input.
     */
    protected get displayNameInputHint(): string {
        switch (this.data.entityType) {
            case EntityType.GROUP: {
                return 'A name displayed with the group';
            }
            case EntityType.ACTUATOR: {
                return 'A name displayed with the actuator';
            }
            case EntityType.SENSOR: {
                return 'A name displayed with the sensor';
            }
        }
    }

    /**
     * An instance of {@link AddEntityDialogResult|`AddEntityDialogResult`} given
     * the current status of the dialog, or `null` if the dialog status is invalid.
     */
    protected get result():
        AddEntityDialogResult
        | null {
        switch (this.data.entityType) {
            case EntityType.GROUP: {
                if (this.groupResult == null) {
                    return null;
                }
                if (this.data.edit == null) {
                    return {
                        type:   EntityType.GROUP,
                        edit:   false,
                        group:  new Group(this.groupResult.name, this.groupResult.displayName),
                        parent: this.entityLocationInputComponent?.chosenLocation ?? null
                    };
                } else {
                    return {
                        type:   EntityType.GROUP,
                        edit:   true,
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
                        type:     EntityType.ACTUATOR,
                        edit:     false,
                        actuator: actuatorResult,
                        parent:   this.entityLocationInputComponent?.chosenLocation ?? null
                    };
                } else {
                    return {
                        type:     EntityType.ACTUATOR,
                        edit:     true,
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
                        edit:   false,
                        sensor: sensorResult,
                        parent: this.entityLocationInputComponent?.chosenLocation ?? null
                    };
                } else {
                    return {
                        type:   EntityType.SENSOR,
                        edit:   true,
                        sensor: {
                            name:          this.sensorResult.name != this.data.edit.name ? this.sensorResult.name : undefined,
                            displayName:   this.sensorResult.displayName != this.data.edit.displayName ? this.sensorResult.displayName : undefined,
                            zigbeeAddress: this.sensorResult.zigbeeAddress != this.data.edit.zigbeeAddress ? this.sensorResult.zigbeeAddress : undefined,
                            type:          this.sensorResult.sensorType != this.data.edit.sensorType ? this.sensorResult.sensorType : undefined,
                            exposes:       this.exposesDirty ? this.deviceExposes : undefined
                        },
                        parent: null
                    };
                }
            }
        }
    }

    /**
     * Whether the dialog is invalid and thus the dialog confirm button should be disabled.
     */
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

    /**
     * Sorts a given list of possible {@link DeviceLibraryProperty|`DeviceLibraryProperty`} in order
     * of most suitable to least suitable for a specific {@link ActuatorType|`ActuatorType`} or
     * {@link SensorType|`SensorType`}.
     *
     * @param {DeviceLibraryProperty[]} library - The available properties to be sorted.
     * @param {ActuatorType | SensorType | null} type - The type of the entity to sort the result by. If `null`, no sorting gets done.
     * @returns {DeviceLibraryProperty[]} - `library`, but sorted in the order of most suitable to least suitable.
     * @protected
     */
    protected getSuggestedExposes(library: DeviceLibraryProperty[], type: ActuatorType | SensorType | null): DeviceLibraryProperty[] {
        return library.slice().sort((a, b) => {
            let aLevel = 0;
            if (a.for.length == 0) {
                aLevel = 1;
            }
            if (type != null && a.for.includes(type)) {
                if (a.for.length == 1) {
                    aLevel = 3;
                } else {
                    aLevel = 2;
                }
            }
            let bLevel = 0;
            if (b.for.length == 0) {
                bLevel = 1;
            }
            if (type != null && b.for.includes(type)) {
                if (b.for.length == 1) {
                    bLevel = 3;
                } else {
                    bLevel = 2;
                }
            }
            return bLevel - aLevel;
        });
    }

    /**
     * Adds a list of {@link Datum|`Datum`} to {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`},
     * presumably from a {@link DeviceLibraryProperty|`DeviceLibraryProperty`}, joining it to the already inserted
     * exposes, ignoring duplicates (same datum name, if the {@link Datum|`Datum`} is otherwise different,
     * the value that's already inserted is kept).
     *
     * @param {Datum[]} data - The {@link Datum|`Datum`s} to add.
     */
    protected set deviceExposesFromLibrary(data: Datum[]) {
        this.deviceExposes.push(
            ...data
                .map(datum =>
                         new Datum(datum.name, datum.type, datum.nullable)
                )
                .filter(datum => !this.deviceExposes.some(d => d.name == datum.name))
        );
        this.exposesDirty = true;
    }

    /**
     * Remove a {@link Datum|`Datum`} from {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`},
     * if not locked according to {@link AddEntityDialogComponent#lockedExposes|`lockedExposes`}. In the
     * latter case, shows the relevant error in {@link AddEntityDialogComponent#errorDatum|`errorDatum`} and
     * {@link AddEntityDialogComponent#errorDatumDependencies|`errorDatumDependencies`}.
     *
     * @param {Datum} datum - The {@link Datum|`Datum`} to remove.
     * @protected
     */
    protected removeDeviceExposes(datum: Datum): void {
        const errorDatum = this.lockedExposes.find(lockedDatum => lockedDatum.name == datum.name);
        if (errorDatum) {
            this.errorDatum             = datum;
            this.errorDatumDependencies = errorDatum.dependencies;
            return;
        }
        this.deviceExposes = this.deviceExposes.filter(d => d !== datum);
        this.exposesDirty  = true;
    }

    /**
     * Checks whether a {@link Datum|`Datum`} in {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`}
     * is locked according to {@link AddEntityDialogComponent#lockedExposes|`lockedExposes`}.
     *
     * @param {Datum} datum - The {@link Datum|`Datum`} to check.
     * @returns {boolean} - `true` if the {@link Datum|`Datum`} is locked, `false` otherwise. For {@link Datum|`Datum`s}
     *                      that are not in {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`} always return
     *                      `false`.
     * @protected
     */
    protected exposeHasError(datum: Datum): boolean {
        if (!this.deviceExposes.some(d => d.name == datum.name)) {
            return false;
        }
        return this.lockedExposes.some(lockedDatum => lockedDatum.name == datum.name);
    }

    /**
     * Opens a dialog containing {@link DatumDefineDialogComponent|`DatumDefineDialogComponent`}
     * to ask the user for information about a new {@link Datum|`Datum`} to add to
     * {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`}. If the dialog result
     * is positive, adds the resulting {@link Datum|`Datum`} to {@link AddEntityDialogComponent#deviceExposes|`deviceExposes`}.
     */
    protected addExposes(): void {

        const dialogRef =
                  this
                      .matDialog
                      .open(
                          DatumDefineDialogComponent,
                          {
                              data: {
                                  forbiddenNames: this.deviceExposes.map(input => input.name),
                                  title:       'Define a new property',
                                  fixNullable: this.data.entityType == EntityType.SENSOR
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

    /**
     * If the data entered in the dialog is valid, closes the dialog with the currently inserted data
     * as a return value.
     */
    protected confirm(): void {
        if (!this.confirmDisabled) {
            this.closeDialog(this.result);
        }
    }

    /** @ignore */
    protected readonly ActuatorType                = ActuatorType;
    /** @ignore */
    protected readonly Object                      = Object;
    /** @ignore */
    protected readonly EntityType                  = EntityType;
    /** @ignore */
    protected readonly ACTUATOR_TYPE_DISPLAY       = ACTUATOR_TYPE_DISPLAY;
    /** @ignore */
    protected readonly ACTUATOR_TYPE_ICON          = ACTUATOR_TYPE_ICON;
    /** @ignore */
    protected readonly Datum                       = Datum;
    /** @ignore */
    protected readonly ACTUATOR_PROPERTIES_LIBRARY = ACTUATOR_PROPERTIES_LIBRARY;
    /** @ignore */
    protected readonly DATUM_TIME_DISPLAY          = DATUM_TYPE_DISPLAY;

    /** @ignore */
    protected readonly SensorType                = SensorType;
    /** @ignore */
    protected readonly SENSOR_TYPE_ICON          = SENSOR_TYPE_ICON;
    /** @ignore */
    protected readonly SENSOR_TYPE_DISPLAY       = SENSOR_TYPE_DISPLAY;
    /** @ignore */
    protected readonly SENSOR_PROPERTIES_LIBRARY = SENSOR_PROPERTIES_LIBRARY;
    /** @ignore */
    protected readonly LoadingStatus             = LoadingStatus;
    /** @ignore */
    protected readonly MixPhase                  = MixPhase;
    /** @ignore */
    protected readonly MixTarget       = MixTarget;
    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT = TOOLTIP_TIMEOUT;
}

/**
 * Input data to a {@link MatDialog|`MatDialog`} using {@link AddEntityDialogComponent|`AddEntityDialogComponent`}.
 */
export type AddEntityDialogData = {
    /** The entity is of type {@link EntityType.GROUP|`EntityType.GROUP`}. */
    entityType: EntityType.GROUP
    /** The {@link Group#name|`name`s} of the {@link Group|`Group`s} that are available as parents for the group being edited or created. */
    groupNames: string[]
    /** The {@link Group#displayName|`displayName`s} of the {@link Group|`Group`s} that are available as parents for the group being edited or created. */
    groupDisplays: string[]
    /** Strings that can't be used as {@link Group#name|`name`s} for the {@link Group|`Group`}. */
    forbiddenNames: string[]
    /** The name of the group that should be pre-filled as the parent of the {@link Group|`Group`} being edited or created. `null` for the root. */
    sonOfGroup: string | null
    /** Optional initial values for editing an existing {@link Group|`Group`}. If not defined, the dialog operates in creation mode. */
    edit?: {
        /** The {@link Group#name|`name`} to edit. */
        name: string;
        /** The {@link Group#displayName|`displayName`} to edit. */
        displayName: string;
    };
} | {
    /** The entity is of type {@link EntityType.ACTUATOR|`EntityType.ACTUATOR`}. */
    entityType: EntityType.ACTUATOR;
    /** The {@link Group#name|`name`s} of the {@link Group|`Group`s} that are available as parents for the actuator being edited or created. */
    groupNames: string[];
    /** The {@link Group#displayName|`displayName`s} of the {@link Group|`Group`s} that are available as parents for the actuator being edited or created. */
    groupDisplays: string[];
    /** Strings that can't be used as {@link Actuator#name|`name`s} for the {@link Actuator|`Actuator`}. */
    forbiddenNames: string[];
    /** The name of the group that should be pre-filled as the parent of the actuator being edited or created. `null` for the root. */
    sonOfGroup: string | null;
    /** Optional initial values for editing an existing actuator. If not defined, the dialog operates in creation mode. */
    edit?: {
        /** The {@link Actuator#name|`name`} to edit. */
        name: string;
        /** The {@link Actuator#displayName|`displayName`} to edit. */
        displayName: string;
        /** The {@link Actuator#zigbeeAddress|`zigbeeAddress`} to edit. */
        zigbeeAddress: string;
        /** The {@link Actuator#type|`actuatorType`} to edit. */
        actuatorType: ActuatorType;
        /** The {@link Actuator#exposes|`exposes`} to edit. */
        exposes: Datum[];
    };
} | {
    /** The entity is of type {@link EntityType.SENSOR|`EntityType.SENSOR`}. */
    entityType: EntityType.SENSOR;
    /** The {@link Group#name|`name`s} of the {@link Group|`Group`s} that are available as parents for the sensor being edited or created. */
    groupNames: string[];
    /** The {@link Group#displayName|`displayName`s} of the {@link Group|`Group`s} that are available as parents for the sensor being edited or created. */
    groupDisplays: string[];
    /** Strings that can't be used as {@link Sensor#name|`name`s} for the {@link Sensor|`Sensor`}. */
    forbiddenNames: string[];
    /** The name of the group that should be pre-filled as the parent of the sensor being edited or created. `null` for the root. */
    sonOfGroup: string | null;
    /** Optional initial values for editing an existing sensor. If not defined, the dialog operates in creation mode. */
    edit?: {
        /** The {@link Sensor#name|`name`} to edit. */
        name: string;
        /** The {@link Sensor#displayName|`displayName`} to edit. */
        displayName: string;
        /** The {@link Sensor#zigbeeAddress|`zigbeeAddress`} to edit. */
        zigbeeAddress: string;
        /** The {@link Sensor#type|`sensorType`} to edit. */
        sensorType: SensorType;
        /** The {@link Sensor#exposes|`exposes`} to edit. */
        exposes: Datum[];
    };
}

/**
 * The result of a {@link MatDialog|`MatDialog`} using {@link AddEntityDialogComponent|`AddEntityDialogComponent`}.
 */
export type AddEntityDialogResult =
    AddEntityDialogResultGroup
    | AddEntityDialogResultActuator
    | AddEntityDialogResultSensor
    | EditEntityDialogResultGroup
    | EditEntityDialogResultActuator
    | EditEntityDialogResultSensor;

/**
 * The result of a {@link MatDialog|`MatDialog`} using {@link AddEntityDialogComponent|`AddEntityDialogComponent`},
 * operating in creation mode, resulting in a {@link Group|`Group`}.
 */
export interface AddEntityDialogResultGroup {
    /** The entity is of type {@link EntityType.GROUP|`EntityType.GROUP`}. */
    type: EntityType.GROUP;
    /** The dialog was operating in creation mode. */
    edit: false;
    /** The created {@link Group|`Group`}. */
    group: Group;
    /** The {@link Group#name|`name`} of the {@link Group|`Group`} chosen as the parent. */
    parent: string | null;
}

/**
 * The result of a {@link MatDialog|`MatDialog`} using {@link AddEntityDialogComponent|`AddEntityDialogComponent`},
 * operating in creation mode, resulting in an {@link Actuator|`Actuator`}.
 */
export interface AddEntityDialogResultActuator {
    /** The entity is of type {@link EntityType.ACTUATOR|`EntityType.ACTUATOR`}. */
    type: EntityType.ACTUATOR;
    /** The dialog was operating in creation mode. */
    edit: false;
    /** The created {@link Actuator|`Actuator`}. */
    actuator: Actuator;
    /** The {@link Group#name|`name`} of the {@link Group|`Group`} chosen as the parent. */
    parent: string | null;
}

/**
 * The result of a {@link MatDialog|`MatDialog`} using {@link AddEntityDialogComponent|`AddEntityDialogComponent`},
 * operating in creation mode, resulting in a {@link Sensor|`Sensor`}.
 */
export interface AddEntityDialogResultSensor {
    /** The entity is of type {@link EntityType.SENSOR|`EntityType.SENSOR`}. */
    type: EntityType.SENSOR;
    /** The dialog was operating in creation mode. */
    edit: false;
    /** The created {@link Sensor|`Sensor`}. */
    sensor: Sensor;
    /** The {@link Group#name|`name`} of the {@link Group|`Group`} chosen as the parent. */
    parent: string | null;
}

/**
 * The result of a {@link MatDialog|`MatDialog`} using {@link AddEntityDialogComponent|`AddEntityDialogComponent`},
 * operating in edit mode, resulting in an edit to a {@link Group|`Group`}.
 */
export interface EditEntityDialogResultGroup {
    /** The entity is of type {@link EntityType.GROUP|`EntityType.GROUP`}. */
    type: EntityType.GROUP;
    /** The dialog was operating in edit mode. */
    edit: true;
    /** The changes to apply to the {@link Group|`Group`}. */
    group: GroupEditChanges;
    /** The {@link Group#name|`name`} of the {@link Group|`Group`} chosen as the parent. */
    parent: string | null;
}

/**
 * The result of a {@link MatDialog|`MatDialog`} using {@link AddEntityDialogComponent|`AddEntityDialogComponent`},
 * operating in edit mode, resulting in an edit to an {@link Actuator|`Actuator`}.
 */
export interface EditEntityDialogResultActuator {
    /** The entity is of type {@link EntityType.ACTUATOR|`EntityType.ACTUATOR`}. */
    type: EntityType.ACTUATOR;
    /** The dialog was operating in edit mode. */
    edit: true;
    /** The changes to apply to the {@link Actuator|`Actuator`}. */
    actuator: ActuatorEditChanges;
    /** The {@link Group#name|`name`} of the {@link Group|`Group`} chosen as the parent. */
    parent: string | null;
}

/**
 * The result of a {@link MatDialog|`MatDialog`} using {@link AddEntityDialogComponent|`AddEntityDialogComponent`},
 * operating in edit mode, resulting in an edit to a {@link Sensor|`Sensor`}.
 */
export interface EditEntityDialogResultSensor {
    /** The entity is of type {@link EntityType.SENSOR|`EntityType.SENSOR`}. */
    type: EntityType.SENSOR;
    /** The dialog was operating in edit mode. */
    edit: true;
    /** The changes to apply to the {@link Sensor|`Sensor`}. */
    sensor: SensorEditChanges;
    /** The {@link Group#name|`name`} of the {@link Group|`Group`} chosen as the parent. */
    parent: string | null;
}

/**
 * Information about an {@link Actuator|`Actuator`} used in {@link AddEntityDialogComponent|`AddEntityDialogComponent`}.
 */
export interface ActuatorInfo {
    /** {@link Actuator#name|`Actuator.name`}. */
    name: string;
    /** {@link Actuator#displayName|`Actuator.displayName`}. */
    displayName: string;
    /** {@link Actuator#type|`Actuator.type`}. */
    actuatorType: ActuatorType;
    /** {@link Actuator#zigbeeAddress|`Actuator.zigbeeAddress`}. */
    zigbeeAddress: string;
}

/**
 * Information about a {@link Sensor|`Sensor`} used in {@link AddEntityDialogComponent|`AddEntityDialogComponent`}.
 */
export interface SensorInfo {
    /** {@link Sensor#name|`Sensor.name`}. */
    name: string;
    /** {@link Sensor#displayName|`Sensor.displayName`}. */
    displayName: string;
    /** {@link Sensor#type|`Sensor.type`}. */
    sensorType: SensorType;
    /** {@link Sensor#zigbeeAddress|`Sensor.zigbeeAddress`}. */
    zigbeeAddress: string;
}
