import {Component} from '@angular/core';
import {ToolbarComponent, ToolbarElement, ToolBarElementType} from '../../auxiliary/toolbar/toolbar.component';
import {Router} from '@angular/router';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatRipple} from '@angular/material/core';
import {BetterMatDialog} from '../../../utils/better-mat-dialog';
import {StringInputDialogComponent} from '../../dialogs/string-input-dialog/string-input-dialog.component';
import {MatSlider, MatSliderThumb} from '@angular/material/slider';
import {ConstantEditDialogComponent} from '../../mixing/mix/constant-edit-dialog/constant-edit-dialog.component';
import {DatumType} from '@common/mixing/mix/datum';
import {MatChipListbox, MatChipOption} from '@angular/material/chips';
import {MainPages, SNACKBAR_TIMEOUT} from '../../../utils/constants';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {LocalStorageObject, LocalStorageService} from '../../../services/local-storage.service';
import {SystemSettings} from '@common/system/settings/settings';
import {LoadingStatus} from '../../../utils/enums';
import {DynamicSvgComponent} from '../../auxiliary/dynamic-svg/dynamic-svg.component';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {SystemService} from '../../../services/system.service';
import {MatSnackBar} from '@angular/material/snack-bar';


@Component({
               selector:    'house-mix-settings',
               imports:     [
                   ToolbarComponent,
                   ReactiveFormsModule,
                   MatFormFieldModule, MatInputModule, FormsModule, MatButtonModule, MatIconModule, MatRipple, MatSlider, MatSliderThumb, MatChipListbox, MatChipOption, MatSlideToggle,
                   DynamicSvgComponent, MatProgressSpinner
               ],
               templateUrl: './settings.component.html',
               styleUrl:    './settings.component.scss'
           })
export class SettingsComponent {

    protected offlineCheckFormControl: FormControl<number | null> = new FormControl<number | null>(2);
    protected onlineCheckFormControl: FormControl<number | null>  = new FormControl<number | null>(0);
    protected unavailableFormControl: FormControl<number | null>  = new FormControl<number | null>(5);

    protected loadingStatus: LoadingStatus = LoadingStatus.LOADING;
    protected randomIcon: string           = Math.random() > 0.5 ? 'clock.svg' : 'hourglass.svg';

    protected settings: SystemSettings = SystemSettings.fromJSON({
                                                                     homeName:           'Home',
                                                                     offlineCheck:       60,
                                                                     onlineCheck:        10,
                                                                     unavailableTimeout: 300,
                                                                     throttleTiming:     100
                                                                 });

    protected localSettings: LocalSettings;

    constructor(
        private router: Router,
        private dialog: BetterMatDialog,
        private localStorageService: LocalStorageService,
        private systemService: SystemService,
        private snackBar: MatSnackBar
    ) {
        this.reload();

        this.localSettings = this.localStorageService.getItem(LOCAL_SETTINGS_KEY);
        this.offlineCheckFormControl.valueChanges.subscribe(newValue => {
            this.updateOfflineCheck(CHECK_OPTIONS[newValue ?? 0] ?? 60);
        });
        this.onlineCheckFormControl.valueChanges.subscribe(newValue => {
            this.updateOnlineCheck(CHECK_OPTIONS[newValue ?? 0] ?? 60);
        });
        this.unavailableFormControl.valueChanges.subscribe(newValue => {
            this.updateUnavailable(UNAVAILABLE_OPTIONS[newValue ?? 0] ?? 300);
        });
    }

    protected reload(): void {
        this.loadingStatus = LoadingStatus.LOADING;
        this
            .systemService
            .getSettings()
            .then(settings => {
                this.loadingStatus = LoadingStatus.LOADED;
                this.newSettingsData(settings);
            })
            .catch(() => {
                this.loadingStatus = LoadingStatus.ERROR;
            });
    }

    private newSettingsData(settings: SystemSettings): void {
        this.settings = settings;
        this.setNumberSlider(settings.offlineCheck, CHECK_OPTIONS, this.offlineCheckFormControl);
        this.setNumberSlider(settings.onlineCheck, CHECK_OPTIONS, this.onlineCheckFormControl);
        this.setNumberSlider(settings.unavailableTimeout, UNAVAILABLE_OPTIONS, this.unavailableFormControl);
    }

    protected toolbarClick(): void {
        void this.router.navigate(['system']);
    }

    protected changeName(): void {
        this.dialog.open(StringInputDialogComponent, {
            data: {
                defaultValue: this.settings.homeName,
                hint:         'Select a name for this home',
                inputLabel:   'Home name'
            }
        })
            .afterClosed()
            .subscribe(result => {
                if (result != null && result.trim() != '') {
                    result = result.trim();
                    if (this.settings.homeName != result) {
                        const rollBackValue    = this.settings.homeName;
                        this.settings.homeName = result;
                        this.systemService.editSettings(
                            {
                                homeName: result
                            })
                            .catch(() => {
                                this.settings.homeName = rollBackValue;
                                this.snackBar.open(
                                    'There has been an error while updating the settings',
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

    protected changeCheck(online: boolean): void {
        this
            .dialog
            .open(ConstantEditDialogComponent, {
                data: {
                    type:         DatumType.NUMBER,
                    value:        online ? this.settings.onlineCheck : this.settings.offlineCheck,
                    datumName:    online ? 'Check if device rejoined network every' : 'Check if device went offline every',
                    numberMin:    10,
                    numberMax:    3600,
                    numberStep:   1,
                    numberSuffix: 'seconds'
                }
            })
            .afterClosed()
            .subscribe(result => {
                if (result?.successful == true) {
                    if (online) {
                        this.updateOnlineCheck(result.value as number);
                    } else {
                        this.updateOfflineCheck(result.value as number);
                    }
                }
            });
    }

    private updateOfflineCheck(result: number): void {
        const rollBackValue = this.settings.offlineCheck;
        if (rollBackValue != result) {
            this.settings.offlineCheck = result;
            this.setNumberSlider(this.settings.offlineCheck, CHECK_OPTIONS, this.offlineCheckFormControl);
            this.systemService.editSettings(
                {
                    offlineCheck: result
                })
                .catch(() => {
                    this.settings.offlineCheck = rollBackValue;
                    this.setNumberSlider(this.settings.offlineCheck, CHECK_OPTIONS, this.offlineCheckFormControl);
                    this.snackBar.open(
                        'There has been an error while updating the settings',
                        undefined,
                        {
                            duration: SNACKBAR_TIMEOUT
                        }
                    );
                });
        }
    }

    private updateOnlineCheck(result: number): void {
        const rollBackValue = this.settings.onlineCheck;
        if (rollBackValue != result) {
            this.settings.onlineCheck = result;
            this.setNumberSlider(this.settings.onlineCheck, CHECK_OPTIONS, this.onlineCheckFormControl);
            this.systemService.editSettings(
                {
                    onlineCheck: result
                })
                .catch(() => {
                    this.settings.onlineCheck = rollBackValue;
                    this.setNumberSlider(this.settings.onlineCheck, CHECK_OPTIONS, this.onlineCheckFormControl);
                    this.snackBar.open(
                        'There has been an error while updating the settings',
                        undefined,
                        {
                            duration: SNACKBAR_TIMEOUT
                        }
                    );
                });
        }
    }

    protected changeUnavailable(): void {
        this
            .dialog
            .open(ConstantEditDialogComponent, {
                data: {
                    type:         DatumType.NUMBER,
                    value:        this.settings.unavailableTimeout,
                    datumName:    'Time after which an unavailable device is considered offline',
                    numberMin:    10,
                    numberMax:    86399,
                    numberStep:   1,
                    numberSuffix: 'seconds'
                }
            })
            .afterClosed()
            .subscribe(result => {
                if (result?.successful == true) {
                    this.updateUnavailable(result.value as number);
                }
            });
    }

    private updateUnavailable(result: number): void {
        const rollBackValue = this.settings.unavailableTimeout;
        if (rollBackValue != result) {
            this.settings.unavailableTimeout = result;
            this.setNumberSlider(this.settings.unavailableTimeout, UNAVAILABLE_OPTIONS, this.unavailableFormControl);
            this.systemService.editSettings(
                {
                    unavailableTimeout: result
                })
                .catch(() => {
                    this.settings.unavailableTimeout = rollBackValue;
                    this.setNumberSlider(this.settings.unavailableTimeout, UNAVAILABLE_OPTIONS, this.unavailableFormControl);
                    this.snackBar.open(
                        'There has been an error while updating the settings',
                        undefined,
                        {
                            duration: SNACKBAR_TIMEOUT
                        }
                    );
                });
        }
    }

    protected changeThrottle(): void {
        this
            .dialog
            .open(ConstantEditDialogComponent, {
                data: {
                    type:         DatumType.NUMBER,
                    value:        this.settings.throttleTiming,
                    datumName:    'Zigbee messages throttle timing',
                    numberMin:    0,
                    numberMax:    1000,
                    numberStep:   1,
                    numberSuffix: 'milliseconds'
                }
            })
            .afterClosed()
            .subscribe(result => {
                if (result?.successful == true) {
                    this.updateThrottle(result.value as number);
                }
            });
    }

    private updateThrottle(result: number): void {
        const rollBackValue = this.settings.throttleTiming;
        if (rollBackValue != result) {
            this.settings.throttleTiming = result;
            this.systemService.editSettings(
                {
                    throttleTiming: result
                })
                .catch(() => {
                    this.settings.throttleTiming = rollBackValue;
                    this.snackBar.open(
                        'There has been an error while updating the settings',
                        undefined,
                        {
                            duration: SNACKBAR_TIMEOUT
                        }
                    );
                });
        }
    }

    private saveLocalSettings(): void {
        this.localStorageService.setItem(LOCAL_SETTINGS_KEY, this.localSettings);
    }

    protected changeStartPage(page: MainPages): void {
        this.localSettings.startPage = page;
        this.saveLocalSettings();
    }

    protected changeDevicesLayout(isTree?: boolean): void {
        isTree ??= !this.localSettings.deviceViewLayoutTree;
        if (this.localSettings.deviceViewLayoutTree != isTree) {
            this.localSettings.deviceViewLayoutTree = isTree;
        }
        this.saveLocalSettings();
    }

    protected changeTheme(dark?: boolean): void {
        dark ??= !this.localSettings.darkMode;
        if (this.localSettings.darkMode != dark) {
            this.localSettings.darkMode = dark;
        }
        if (this.localSettings.darkMode) {
            document.firstElementChild?.classList.add('dark');
        } else {
            document.firstElementChild?.classList.remove('dark');
        }
        this.saveLocalSettings();
    }

    private setNumberSlider(value: number, stepPositions: number[], sliderFormControl: FormControl<number | null>): void {
        let lastValue              = -Infinity;
        const positionWithInfinity = stepPositions.concat(Infinity);
        for (let i = 0; i < positionWithInfinity.length; i++) {
            const possibleValue = positionWithInfinity[i] as number;
            if (value > possibleValue) {
                lastValue = possibleValue;
            } else {
                if (value - lastValue > possibleValue - value) {
                    sliderFormControl.setValue(i, {emitEvent: false});
                } else {
                    sliderFormControl.setValue(i - 1, {emitEvent: false});
                }
                return;
            }
        }
    }

    protected getDurationString(seconds: number): string {
        const secondsMod = seconds % 60;
        if (seconds < 60) {
            return `${seconds} second${seconds == 1 ? '' : 's'}`;
        } else {
            const minutes = Math.floor(seconds / 60) % 60;
            if (seconds < 3600) {
                if (secondsMod == 0) {
                    return `${minutes} minute${minutes == 1 ? '' : 's'}`;
                } else {
                    return `${minutes} minute${minutes == 1 ? '' : 's'} ${secondsMod} second${secondsMod == 1 ? '' : 's'}`;
                }
            } else {
                const hours        = Math.floor(seconds / 3600);
                const minuteString = minutes == 0 ? '' : ` ${minutes} minute${minutes == 1 ? '' : 's'}`;
                const secondString = secondsMod == 0 ? '' : ` ${secondsMod} second${secondsMod == 1 ? '' : 's'}`;
                return `${hours} hour${hours == 1 ? '' : 's'}${minuteString}${secondString}`;
            }
        }
    }

    protected readonly ALL_TOOLBAR_ELEMENTS = ALL_TOOLBAR_ELEMENTS;

    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

    protected readonly MainPages     = MainPages;
    protected readonly LoadingStatus = LoadingStatus;
}

enum ToolbarAction {
    BACK = 'back',
}


const ALL_TOOLBAR_ELEMENTS: ToolbarElement[] = [
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'arrow_back',
        id:    ToolbarAction.BACK,
        hint:  'Go back',
        order: 0
    },
    {
        type:  ToolBarElementType.TITLE,
        id:    'title',
        text:  'System settings',
        order: 1
    }
];

const CHECK_OPTIONS = [
    10,
    30,
    45,
    60,
    90,
    120,
    180,
    240,
    300,
    450,
    600
];

const UNAVAILABLE_OPTIONS = [
    60,
    150,
    300,
    450,
    600,
    900,
    1200,
    1800,
    2700,
    3600,
    5400
];

export interface LocalSettings {
    startPage: MainPages,
    deviceViewLayoutTree: boolean,
    darkMode: boolean,
    homeName: string,
}

export const LOCAL_SETTINGS_KEY: LocalStorageObject<LocalSettings> = {
    name:         'localSettings',
    defaultValue: {
        startPage:            MainPages.DEVICES,
        deviceViewLayoutTree: false,
        darkMode:             false,
        homeName:             'Home'
    }
};
