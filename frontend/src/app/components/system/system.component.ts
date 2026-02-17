import {Component} from '@angular/core';
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
import {SystemOrigin} from '@common/system/constants';
import {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';
import {DeviceMonitorDeviceComponent} from '../entities/system/device-monitor-device/device-monitor-device.component';
import {SystemDeviceMonitorDeviceDialogComponent} from '../dialogs/system-device-monitor-device-dialog/system-device-monitor-device-dialog.component';


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
                   DeviceMonitorDeviceComponent
               ],
               templateUrl: './system.component.html',
               styleUrl:    './system.component.scss'
           })
export class SystemComponent {

    protected parameters: SystemParameter[]          = [];
    protected parametersLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected timers: SystemTimer[]              = [];
    protected timersLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected devices: DeviceMonitorDevice[]      = [];
    protected devicesLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected selected: SystemParameter | SystemTimer | DeviceMonitorDevice | null = null;

    constructor(
        private router: Router,
        private systemService: SystemService,
        private matDialog: BetterMatDialog,
        private snackBar: MatSnackBar
    ) {
        this.loadParameters();
        this.loadTimers();
        this.loadDeviceMonitors();
    }

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

    protected get toolbarElements(): ToolbarElement[] {
        return this.filterToolbar();
    }

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
                return this.selected != null && (this.selected instanceof SystemTimer || this.selected instanceof DeviceMonitorDevice);
            case ToolbarAction.DEVICES:
            case ToolbarAction.MIXING:
            case ToolbarAction.SYSTEM:
                return true;
        }
    }

    protected goTo(section: string): void {
        void this.router.navigate([section]);
    }

    protected toolbarClick(id: ToolbarAction): void {
        switch (id) {
            case ToolbarAction.DEVICES: {
                this.goTo('home');
                break;
            }
            case ToolbarAction.MIXING: {
                this.goTo('mixing');
                break;
            }
            case ToolbarAction.SYSTEM: {
                break;
            }
            case ToolbarAction.EDIT: {
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
                }
                break;
            }
            case ToolbarAction.CHANGE_PARAMETER_VALUE: {
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
                break;
            }
            case ToolbarAction.DELETE: {
                let data: DeleteEntityDialogData | null = null;
                const selected                          = this.selected;
                if (selected instanceof SystemParameter) {
                    data = {
                        entityType:        SystemOrigin.PARAMETER,
                        parameterToDelete: selected
                    };
                }
                if (selected instanceof SystemTimer) {
                    data = {
                        entityType:    SystemOrigin.TIMER,
                        timerToDelete: selected
                    };
                }
                if (selected instanceof DeviceMonitorDevice) {
                    data = {
                        entityType:     SystemOrigin.DEVICE_STATUS,
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
                        }
                    });
            }
        }
    }

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

    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

    protected readonly LoadingStatus   = LoadingStatus;
    protected readonly TOOLTIP_TIMEOUT = TOOLTIP_TIMEOUT;
    protected readonly ToolbarAction = ToolbarAction;
}

enum ToolbarAction {
    DEVICES                = 'devices',
    MIXING                 = 'mixing',
    SYSTEM                 = 'system',
    DELETE                 = 'delete',
    CHANGE_PARAMETER_VALUE = 'change-parameter-value',
    EDIT                   = 'edit',
}

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
        hint:  'Mixing',
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
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'edit',
        id:    ToolbarAction.EDIT,
        hint:  'Edit',
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Delete',
        order: 2
    }

];
