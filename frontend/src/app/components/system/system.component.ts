/**
 * This module contains the {@link SystemComponent|system view} component and related classes.
 *
 * @module
 */
import {Component, HostListener} from '@angular/core';
import {ToolbarComponent, ToolbarElement, ToolBarElementType} from '../auxiliary/toolbar/toolbar.component';
import {Router} from '@angular/router';
import {SystemParameter} from '@common/system/parameter/system-parameter';
import {SystemTimer} from '@common/system/timer/system-timer';
import {SystemService} from '../../services/system.service';
import {LoadingStatus} from '../../utils/enums';
import {LoadingScrimComponent} from '../auxiliary/loading-scrim/loading-scrim.component';
import {MatIcon} from '@angular/material/icon';
import {MatIconButton} from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';
import {SNACKBAR_TIMEOUT, TOOLTIP_TIMEOUT} from '../../utils/constants';
import {SystemParameterDialogComponent} from '../dialogs/system-parameter-dialog/system-parameter-dialog.component';
import {BetterMatDialog} from '../../utils/better-mat-dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ParameterComponent} from '../entities/system/parameter/parameter.component';
import {SystemTimerDialogComponent} from '../dialogs/system-timer-dialog/system-timer-dialog.component';
import {TimerComponent} from '../entities/system/timer/timer.component';
import {ConstantEditDialogComponent} from '../mixing/mix/constant-edit-dialog/constant-edit-dialog.component';
import {Datum} from '@common/mixing/mix/datum';
import {HttpErrorResponse, HttpStatusCode} from '@angular/common/http';
import {DeleteEntityDialogComponent, DeleteEntityDialogData} from '../dialogs/delete-entity-dialog/delete-entity-dialog.component';
import {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';
import {DeviceMonitorDeviceComponent} from '../entities/system/device-monitor-device/device-monitor-device.component';
import {SystemDeviceMonitorDeviceDialogComponent} from '../dialogs/system-device-monitor-device-dialog/system-device-monitor-device-dialog.component';
import {SystemAdjustmentDialogComponent} from '../dialogs/system-adjustment-dialog/system-adjustment-dialog.component';
import {Adjustment} from '@common/system/adjustment/adjustment';
import {AdjustmentComponent} from '../entities/system/adjustment/adjustment.component';
import {Subject} from 'rxjs';
import {SystemEntity} from './constants';

// noinspection ES6UnusedImports
import type {ToolbarButton} from '../auxiliary/toolbar/toolbar.component';

/**
 * The component for the "system" view, showing the customization and marginal setup of the system.
 *
 * @component
 * @componentSelector `<house-mix-system>`
 */
@Component({
               selector:    'house-mix-system',
               imports: [
                   ToolbarComponent,
                   LoadingScrimComponent,
                   MatIcon,
                   MatIconButton,
                   MatTooltip,
                   ParameterComponent,
                   TimerComponent,
                   DeviceMonitorDeviceComponent,
                   AdjustmentComponent
               ],
               templateUrl: './system.component.html',
               styleUrl:    './system.component.scss'
           })
export class SystemComponent {

    /** All the {@link SystemParameter|`SystemParameter`s} defined in the system. */
    protected parameters: SystemParameter[]          = [];
    /** The status of the request for loading {@link SystemComponent#parameters|`parameters`}. */
    protected parametersLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /** All the {@link SystemTimer|`SystemTimer`s} defined in the system. */
    protected timers: SystemTimer[]              = [];
    /** The status of the request for loading {@link SystemComponent#timers|`timers`}. */
    protected timersLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /** All the {@link DeviceMonitorDevice|`DeviceMonitorDevice`s} monitored by the system. */
    protected devices: DeviceMonitorDevice[]      = [];
    /** The status of the request for loading {@link SystemComponent#devices|`devices`}. */
    protected devicesLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /** All the {@link Adjustment|`Adjustment`s} applied to the system. */
    protected adjustments: Adjustment<unknown, unknown>[] = [];
    /** The status of the request for loading {@link SystemComponent#adjustments|`adjustments`}. */
    protected adjustmentsLoadingStatus: LoadingStatus     = LoadingStatus.LOADING;

    /** The item currently being selected by the user, `null` means no element is selected. Can be set to change the selected element. */
    protected selected: SystemParameter | SystemTimer | DeviceMonitorDevice | Adjustment<unknown, unknown> | null = null;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {Router} router - The Angular router. Instantiated by dependency injection.
     * @param {SystemService} systemService - The system service. Instantiated by dependency injection.
     * @param {BetterMatDialog} matDialog - The dialog service. Instantiated by dependency injection.
     * @param {MatSnackBar} snackBar - The snackbar service. Instantiated by dependency injection.
     */
    constructor(
        private router: Router,
        private systemService: SystemService,
        private matDialog: BetterMatDialog,
        private snackBar: MatSnackBar
    ) {
        this.loadParameters();
        this.loadTimers();
        this.loadDeviceMonitors();
        this.loadAdjustments();
    }

    /**
     * The subject publishing {@link KeyboardEvent|`KeyboardEvent`s} in the component
     * to pass to {@link ToolbarComponent#keyObservable|`ToolbarComponent.keyObservable`}.
     */
    protected keySubject: Subject<KeyboardEvent> = new Subject<KeyboardEvent>();

    /**
     * Key up event listener on the component.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    @HostListener('keydown', ['$event'])
    public onKeyDown(event: KeyboardEvent): void {
        this.keySubject.next(event);
    }

    /** Fetches the {@link SystemComponent#parameters|`parameters`} from the server. Handles the {@link SystemComponent#parametersLoadingStatus|`parametersLoadingStatus`}. */
    protected loadParameters(): void {
        this.systemService
            .getParameters()
            .then(parameters => {
                this.parameters              = parameters;
                this.parametersLoadingStatus = LoadingStatus.LOADED;
            })
            .catch(() => {
                this.parametersLoadingStatus = LoadingStatus.ERROR;
            });
    }

    /** Fetches the {@link SystemComponent#timers|`timers`} from the server. Handles the {@link SystemComponent#timersLoadingStatus|`timersLoadingStatus`}. */
    protected loadTimers(): void {
        this.systemService
            .getTimers()
            .then(timers => {
                this.timers              = timers;
                this.timersLoadingStatus = LoadingStatus.LOADED;
            })
            .catch(() => {
                this.timersLoadingStatus = LoadingStatus.ERROR;
            });
    }

    /** Fetches the {@link SystemComponent#devices|`devices`} from the server. Handles the {@link SystemComponent#devicesLoadingStatus|`devicesLoadingStatus`}. */
    protected loadDeviceMonitors(): void {
        this.systemService
            .getDeviceMonitorDevices()
            .then(devices => {
                this.devices              = devices;
                this.devicesLoadingStatus = LoadingStatus.LOADED;
            })
            .catch(() => {
                this.devicesLoadingStatus = LoadingStatus.ERROR;
            });
    }

    /** Fetches the {@link SystemComponent#adjustments|`adjustments`} from the server. Handles the {@link SystemComponent#adjustmentsLoadingStatus|`adjustmentsLoadingStatus`}. */
    protected loadAdjustments(): void {
        this.systemService
            .getAdjustments()
            .then(adjustments => {
                this.adjustments              = adjustments;
                this.adjustmentsLoadingStatus = LoadingStatus.LOADED;
            })
            .catch(() => {
                this.adjustmentsLoadingStatus = LoadingStatus.ERROR;
            });
    }

    /** The elements to show in the toolbar. */
    protected get toolbarElements(): ToolbarElement[] {
        return this.filterToolbar();
    }

    /**
     * Filters a list of {@link ToolbarElement|`ToolbarElement`s} returning only the elements that
     * should be shown given the current state of the component.
     *
     * @param {ToolbarElement[]} toFilter - The list of {@link ToolbarElement|`ToolbarElement`s} to filter. Defaults to {@link ALL_TOOLBAR_ELEMENTS|`ALL_TOOLBAR_ELEMENTS`}.
     * @returns {ToolbarElement[]} The filtered list of {@link ToolbarElement|`ToolbarElement`s}.
     */
    private filterToolbar(toFilter: ToolbarElement[] = ALL_TOOLBAR_ELEMENTS): ToolbarElement[] {
        return toFilter
            .filter(toolbarElement => this.isToolbarElementVisible(toolbarElement))
            .map((el) => {
                if ((el.type == ToolBarElementType.BUTTON) && (el.submenu != null)) {
                    return {
                        ...el,
                        submenu: this.filterToolbar(el.submenu)
                    };
                } else {
                    return el;
                }
            });
    }

    /**
     * Checks whether a {@link ToolbarElement|`ToolbarElement`s} should be shown given the current state of the component.
     *
     * @param {ToolbarElement} toolbarElement - The {@link ToolbarElement|`ToolbarElement`} to check.
     * @returns {boolean} Whether the element should be shown.
     */
    private isToolbarElementVisible(toolbarElement: ToolbarElement): boolean {
        if (!Object.values<string>(ToolbarAction).includes(toolbarElement.id)) {
            return true;
        }
        switch (toolbarElement.id as ToolbarAction) {
            case ToolbarAction.DELETE:
                return this.selected != null;
            case ToolbarAction.CHANGE_PARAMETER_VALUE:
                return this.selected != null && this.selected instanceof SystemParameter;
            case ToolbarAction.EDIT:
                return this.selected != null && (this.selected instanceof SystemTimer || this.selected instanceof DeviceMonitorDevice || this.selected instanceof Adjustment);
            case ToolbarAction.DEVICES:
            case ToolbarAction.MIXING:
            case ToolbarAction.SYSTEM:
            case ToolbarAction.SETTINGS:
                return true;
        }
    }

    /**
     * Performs the action linked to a {@link ToolbarButton|`ToolbarButton`}'s click.
     *
     * @param {ToolbarAction} id - The {@link ToolbarButton#id|`id`} of the {@link ToolbarButton|`ToolbarButton`} that was clicked.
     */
    protected toolbarClick(id: ToolbarAction): void {
        switch (id) {
            case ToolbarAction.DEVICES: {
                this.goTo('devices');
                break;
            }
            case ToolbarAction.MIXING: {
                this.goTo('mixing');
                break;
            }
            case ToolbarAction.SETTINGS: {
                this.goTo('system/settings');
                break;
            }
            case ToolbarAction.SYSTEM: {
                break;
            }
            case ToolbarAction.EDIT: {
                this.edit();
                break;
            }
            case ToolbarAction.CHANGE_PARAMETER_VALUE: {
                this.changeParameterValue();
                break;
            }
            case ToolbarAction.DELETE: {
                this.delete();
            }
        }
    }

    /**
     * Open a dialog to edit the {@link SystemComponent#selected|`selected`} element, and edit it if successful.
     */
    private edit(): void {
        const selected = this.selected;
        if (selected != null && (selected instanceof SystemTimer)) {

            this.matDialog
                .open(
                    SystemTimerDialogComponent,
                    {
                        data: {
                            edit:           selected,
                            forbiddenNames: this.timers.map(param => param.name).filter(name => name != selected.name)
                        }
                    }
                )
                .afterClosed()
                .subscribe((result: SystemTimer | undefined) => {
                    if (result != null) {
                        this.systemService
                            .editTimer(result, {name: selected.name})
                            .then(() => {
                                const position = this.timers.indexOf(selected);
                                if (position != -1) {
                                    this.timers.splice(position, 1, result);
                                }
                            })
                            .catch(() => {
                                this.snackBar.open(
                                    'There has been an error while editing the timer',
                                    undefined,
                                    {
                                        duration: SNACKBAR_TIMEOUT
                                    }
                                );
                            });
                    }
                });
        } else if (selected != null && (selected instanceof DeviceMonitorDevice)) {
            this.matDialog
                .open(
                    SystemDeviceMonitorDeviceDialogComponent,
                    {
                        data: {
                            forbiddenNames: this.devices.map(param => param.name),
                            edit:           selected
                        }
                    }
                )
                .afterClosed()
                .subscribe((result: DeviceMonitorDevice | undefined) => {
                    if (result != null) {
                        this.systemService
                            .editDeviceMonitorDevice(result, {name: selected.name})
                            .then(() => {
                                selected.ip = result.ip;
                            })
                            .catch(() => {
                                this.snackBar.open(
                                    'There has been an error while editing the device monitoring info',
                                    undefined,
                                    {
                                        duration: SNACKBAR_TIMEOUT
                                    }
                                );
                            });
                    }
                });
        } else if (selected != null && (selected instanceof Adjustment)) {
            this.matDialog
                .open(
                    SystemAdjustmentDialogComponent,
                    {
                        data: {
                            edit: selected
                        }
                    }
                )
                .afterClosed()
                .subscribe((result: Adjustment<unknown, unknown> | undefined) => {
                    if (result != null) {
                        this.systemService
                            .editAdjustment(result, {id: selected.id as number})
                            .then(() => {
                                selected.data = result.data;
                            })
                            .catch(() => {
                                this.snackBar.open(
                                    'There has been an error while editing the adjustment',
                                    undefined,
                                    {
                                        duration: SNACKBAR_TIMEOUT
                                    }
                                );
                            });
                    }
                });
        }
    }

    /**
     * Open a dialog to select a new value for the {@link SystemComponent#selected|`selected`} element,
     * if it's a {@link SystemParameter|`SystemParameter`}, and edit it if successful.
     */
    private changeParameterValue(): void {
        const selected = this.selected;
        if (selected != null && selected instanceof SystemParameter) {
            this.matDialog.open(
                ConstantEditDialogComponent,
                {
                    data: {
                        type:      selected.datum.type,
                        value:     selected.value ?? Datum.getDefaultForType(selected.datum.type),
                        datumName: selected.displayName,
                        canClear:  selected.datum.nullable
                    }
                }
            )
                .afterClosed()
                .subscribe(
                    value => {
                        if (value?.successful == true) {
                            this.systemService.setParameterValue(
                                {
                                    value: Datum.valueToJSON(value.value, selected.datum.type)
                                },
                                {name: selected.name}
                            )
                                .then(() => {
                                    selected.value = value.value;
                                })
                                .catch((e: unknown) => {
                                    if (e instanceof HttpErrorResponse) {
                                        if (e.status as HttpStatusCode == HttpStatusCode.NotFound) {
                                            this.snackBar.open(
                                                'The parameter cannot be set because it doesn\'t exist',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                            return;
                                        }
                                    }
                                    this.snackBar.open(
                                        'There has been an error while setting this parameter\'s value',
                                        undefined,
                                        {
                                            duration: SNACKBAR_TIMEOUT
                                        }
                                    );
                                });
                        }
                    }
                );
        }
    }

    /**
     * Open a dialog to confirm the deletion of the {@link SystemComponent#selected|`selected`} element, and delete it if successful.
     */
    private delete(): void {
        let data: DeleteEntityDialogData | null = null;
        const selected                          = this.selected;
        if (selected instanceof SystemParameter) {
            data = {
                entityType:        SystemEntity.PARAMETER,
                parameterToDelete: selected
            };
        }
        if (selected instanceof SystemTimer) {
            data = {
                entityType:    SystemEntity.TIMER,
                timerToDelete: selected
            };
        }
        if (selected instanceof DeviceMonitorDevice) {
            data = {
                entityType:     SystemEntity.DEVICE_STATUS,
                deviceToDelete: selected
            };
        }
        if (selected instanceof Adjustment) {
            data = {
                entityType:     SystemEntity.ADJUSTMENT,
                deviceToDelete: selected
            };
        }
        if (data == null) {
            return;
        }

        this.matDialog.open(
            DeleteEntityDialogComponent,
            {
                data
            }
        )
            .afterClosed()
            .subscribe(result => {
                if (result == true) {
                    this.selected = null;
                    if (selected instanceof SystemParameter) {
                        this.systemService
                            .deleteParameter({
                                                 name: selected.name
                                             })
                            .then(() => {
                                const index = this.parameters.indexOf(selected);
                                if (index != -1) {
                                    this.parameters.splice(index, 1);
                                }
                            })
                            .catch(() => {
                                this.snackBar.open(
                                    'There has been an error while deleting the parameter',
                                    undefined,
                                    {
                                        duration: SNACKBAR_TIMEOUT
                                    }
                                );
                            });
                    }
                    if (selected instanceof SystemTimer) {
                        this.systemService
                            .deleteTimer({
                                             name: selected.name
                                         })
                            .then(() => {
                                const index = this.timers.indexOf(selected);
                                if (index != -1) {
                                    this.timers.splice(index, 1);
                                }
                            })
                            .catch(() => {
                                this.snackBar.open(
                                    'There has been an error while deleting the timer',
                                    undefined,
                                    {
                                        duration: SNACKBAR_TIMEOUT
                                    }
                                );
                            });
                    }
                    if (selected instanceof DeviceMonitorDevice) {
                        this.systemService
                            .deleteDeviceMonitorDevice({
                                                           name: selected.name
                                                       })
                            .then(() => {
                                const index = this.devices.indexOf(selected);
                                if (index != -1) {
                                    this.devices.splice(index, 1);
                                }
                            })
                            .catch(() => {
                                this.snackBar.open(
                                    'There has been an error while deleting the device from monitoring',
                                    undefined,
                                    {
                                        duration: SNACKBAR_TIMEOUT
                                    }
                                );
                            });
                    }
                    if (selected instanceof Adjustment) {
                        this.systemService
                            .deleteAdjustment({
                                                  id: selected.id as number
                                              })
                            .then(() => {
                                const index = this.adjustments.indexOf(selected);
                                if (index != -1) {
                                    this.adjustments.splice(index, 1);
                                }
                            })
                            .catch(() => {
                                this.snackBar.open(
                                    'There has been an error while deleting the adjustment',
                                    undefined,
                                    {
                                        duration: SNACKBAR_TIMEOUT
                                    }
                                );
                            });
                    }
                }
            });
    }

    /**
     * Navigate to another section of the app.
     *
     * @param {string} section - The section to navigate to.
     */
    protected goTo(section: string): void {
        void this.router.navigate([section]);
    }

    /** Open a dialog to create a new {@link SystemParameter|`SystemParameter`}, and add it to the system if successful. */
    protected addParameter(): void {
        this.matDialog
            .open(
                SystemParameterDialogComponent,
                {
                    data: {
                        forbiddenNames: this.parameters.map(param => param.name)
                    }
                }
            )
            .afterClosed()
            .subscribe((result: SystemParameter | undefined) => {
                if (result != null) {
                    this.systemService
                        .createParameter(result)
                        .then(() => {
                            this.parameters.push(result);
                        })
                        .catch(() => {
                            this.snackBar.open(
                                'There has been an error while creating the parameter',
                                undefined,
                                {
                                    duration: SNACKBAR_TIMEOUT
                                }
                            );
                        });
                }
            });

    }

    /** Open a dialog to create a new {@link SystemTimer|`SystemTimer`}, and add it to the system if successful. */
    protected addTimer(): void {
        this.matDialog
            .open(
                SystemTimerDialogComponent,
                {
                    data: {
                        forbiddenNames: this.timers.map(param => param.name)
                    }
                }
            )
            .afterClosed()
            .subscribe((result: SystemTimer | undefined) => {
                if (result != null) {
                    this.systemService
                        .createTimer(result)
                        .then(() => {
                            this.timers.push(result);
                        })
                        .catch(() => {
                            this.snackBar.open(
                                'There has been an error while creating the timer',
                                undefined,
                                {
                                    duration: SNACKBAR_TIMEOUT
                                }
                            );
                        });
                }
            });
    }

    /** Open a dialog to create a new {@link DeviceMonitorDevice|`DeviceMonitorDevice`}, and add it to the system if successful. */
    protected addDevice(): void {
        this.matDialog
            .open(
                SystemDeviceMonitorDeviceDialogComponent,
                {
                    data: {
                        forbiddenNames: this.devices.map(param => param.name)
                    }
                }
            )
            .afterClosed()
            .subscribe((result: DeviceMonitorDevice | undefined) => {
                if (result != null) {
                    this.systemService
                        .createDeviceMonitorDevice(result)
                        .then(() => {
                            this.devices.push(result);
                        })
                        .catch(() => {
                            this.snackBar.open(
                                'There has been an error while creating the device monitoring',
                                undefined,
                                {
                                    duration: SNACKBAR_TIMEOUT
                                }
                            );
                        });
                }
            });
    }

    /** Open a dialog to create a new {@link Adjustment|`Adjustment`}, and add it to the system if successful. */
    protected addAdjustment(): void {
        this.matDialog
            .open(
                SystemAdjustmentDialogComponent,
                {
                    data: {}
                }
            )
            .afterClosed()
            .subscribe((result: Adjustment<unknown, unknown> | undefined) => {
                if (result != null) {
                    // console.log(result);
                    this.systemService
                        .createAdjustment(result)
                        .then((id) => {
                            result.id = id.id;
                            this.adjustments.push(result);
                        })
                        .catch(() => {
                            this.snackBar.open(
                                'There has been an error while creating the adjustment',
                                undefined,
                                {
                                    duration: SNACKBAR_TIMEOUT
                                }
                            );
                        });
                }
            });
    }

    /**
     * Casts a `string` to a {@link ToolbarAction|`ToolbarAction`}.
     * Does not check for the real existence of an action with such name.
     *
     * @param {string} val - The string representation of a {@link ToolbarAction|`ToolbarAction`}.
     * @returns {ToolbarAction} `val` cast as {@link ToolbarAction|`ToolbarAction`}.
     */
    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

    /** @ignore */
    protected readonly LoadingStatus   = LoadingStatus;
    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly ToolbarAction = ToolbarAction;
}

/**
 * @notExported
 */
enum ToolbarAction {
    /** Button to move to the "Home" (device) view. */
    DEVICES                = 'devices',
    /** Button to move to the "Mixing" view. */
    MIXING                 = 'mixing',
    /** Button to move to the "System" view. */
    SYSTEM                 = 'system',
    /** Button to delete the selected element. */
    DELETE                 = 'delete',
    /** Button to set the selected {@link SystemParameter|`SystemParameter`} element. */
    CHANGE_PARAMETER_VALUE = 'change-parameter-value',
    /** Button to edit the selected element. */
    EDIT                   = 'edit',
    /** Button to open the system settings. */
    SETTINGS = 'settings'
}

/**
 * All the {@link ToolbarElement|`ToolbarElement`s} in {@link SystemComponent|`SystemComponent`}'s {@link ToolbarComponent|`ToolbarComponent`}.
 *
 * @notExported
 */
const ALL_TOOLBAR_ELEMENTS: ToolbarElement[] = [
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'dashboard',
        id:    ToolbarAction.DEVICES,
        hint:  'Device view',
        order: 0
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'instant_mix',
        id:    ToolbarAction.MIXING,
        hint: 'Mixing view',
        order: 0
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'hub',
        id:    ToolbarAction.SYSTEM,
        hint:  'System view',
        order: 0
    },
    {
        type:  ToolBarElementType.SPACER,
        id:    'spacer-1',
        order: 1
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'edit_square',
        id:    ToolbarAction.CHANGE_PARAMETER_VALUE,
        hint:  'Change parameter value',
        shortcut: {
            codes:      ['Enter', 'NumpadEnter'],
            osModifier: false,
            shift:      false,
            alt:        false
        },
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'edit',
        id:    ToolbarAction.EDIT,
        hint:  'Edit',
        shortcut: {
            codes:      ['Enter', 'NumpadEnter'],
            osModifier: false,
            shift:      false,
            alt:        false
        },
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Delete',
        shortcut: {
            codes:      ['Delete', 'Backspace'],
            osModifier: false,
            shift:      false,
            alt:        false
        },
        order: 2
    },
    {
        type:  ToolBarElementType.DIVIDER,
        id:    'divider-1',
        order: 3
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'settings',
        id:    ToolbarAction.SETTINGS,
        hint:  'System settings',
        shortcut: {
            codes:      ['KeyP'],
            osModifier: true,
            shift:      false,
            alt:        false
        },
        order: 4
    }

];
