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
import {ConfirmDialogComponent, ConfirmDialogData} from '../dialogs/confirm-dialog/confirm-dialog.component';
import {SystemTimerDialogComponent} from '../dialogs/system-timer-dialog/system-timer-dialog.component';
import {TimerComponent} from '../entities/system/timer/timer.component';
import {ConstantEditDialogComponent} from '../mixing/mix/constant-edit-dialog/constant-edit-dialog.component';
import {Datum} from '@common/mixing/mix/datum';
import {HttpErrorResponse, HttpStatusCode} from '@angular/common/http';

@Component({
               selector:    'house-mix-system',
               imports:     [
                   ToolbarComponent,
                   LoadingScrimComponent,
                   MatIcon,
                   MatIconButton,
                   MatTooltip,
                   ParameterComponent,
                   TimerComponent
               ],
               templateUrl: './system.component.html',
               styleUrl:    './system.component.scss'
           })
export class SystemComponent {

    protected parameters: SystemParameter[]          = [];
    protected parametersLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected timers: SystemTimer[]              = [];
    protected timersLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected selected: SystemParameter | SystemTimer | null = null;

    constructor(
        private router: Router,
        private systemService: SystemService,
        private matDialog: BetterMatDialog,
        private snackbar: MatSnackBar
    ) {
        systemService
            .getParameters()
            .then(parameters => {
                this.parameters              = parameters;
                this.parametersLoadingStatus = LoadingStatus.LOADED;
            })
            .catch(() => {
                this.parametersLoadingStatus = LoadingStatus.ERROR;
            });
        systemService
            .getTimers()
            .then(timers => {
                this.timers              = timers;
                this.timersLoadingStatus = LoadingStatus.LOADED;
            })
            .catch(() => {
                this.timersLoadingStatus = LoadingStatus.ERROR;
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
                                    this.systemService.setParameterValue({
                                                                             value: value.value
                                                                         }, {name: selected.name})
                                        .then(() => {
                                            selected.value = value.value;
                                        })
                                        .catch((e: unknown) => {
                                            if (e instanceof HttpErrorResponse) {
                                                if (e.status as HttpStatusCode == HttpStatusCode.NotFound) {
                                                    this.snackbar.open(
                                                        "The parameter cannot be set because it doesn't exist",
                                                        undefined,
                                                        {
                                                            duration: SNACKBAR_TIMEOUT
                                                        }
                                                    );
                                                    return;
                                                }
                                            }
                                            this.snackbar.open(
                                                "There has been an error while setting this parameter's value",
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
                let data: ConfirmDialogData | null = null;
                const selected                     = this.selected;
                if (this.selected instanceof SystemParameter) {
                    data = {
                        message:     `Are you sure you want to delete the parameter "${this.selected.displayName}"?`,
                        title:       'Delete parameter',
                        confirmText: 'Delete',
                        warn:        true
                    };
                }
                if (this.selected instanceof SystemTimer) {
                    data = {
                        message:     `Are you sure you want to delete the timer "${this.selected.displayName}"?`,
                        title:       'Delete timer',
                        confirmText: 'Delete',
                        warn:        true
                    };
                }
                if (data == null) {
                    return;
                }
                this.matDialog.open(ConfirmDialogComponent, {
                    data
                })
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
                                        this.snackbar.open(
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
                                        this.snackbar.open(
                                            'There has been an error while deleting the timer',
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
                            this.snackbar.open(
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
                            this.snackbar.open(
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

    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

    protected readonly LoadingStatus   = LoadingStatus;
    protected readonly TOOLTIP_TIMEOUT = TOOLTIP_TIMEOUT;
}

enum ToolbarAction {
    DEVICES                = 'devices',
    MIXING                 = 'mixing',
    SYSTEM                 = 'system',
    DELETE                 = 'delete',
    CHANGE_PARAMETER_VALUE = 'change-parameter-value'
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
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Delete',
        order: 2
    }

];
