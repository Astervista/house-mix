/**
 * This module contains the {@link SystemSettings|settings view} component and related classes.
 *
 * @module
 */
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

// noinspection ES6UnusedImports
import type {ToolbarButton} from '../../auxiliary/toolbar/toolbar.component';
// noinspection ES6UnusedImports
import type {HomeComponent} from '../../home/home.component';

/**
 * The component for the "settings" view, where {@link SystemSettings|`SystemSettings`} and
 * {@link LocalSettings|`LocalSettings`} can be edited.
 *
 * @component
 * @componentSelector `<house-mix-settings>`
 */
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

    /** {@link FormControl|`FormControl`} for the slider input for {@link SystemSettings#offlineCheck|`SystemSettings.offlineCheck`}. */
    protected offlineCheckFormControl: FormControl<number | null> = new FormControl<number | null>(2);
    /** {@link FormControl|`FormControl`} for the slider input for {@link SystemSettings#onlineCheck|`SystemSettings.onlineCheck`}. */
    protected onlineCheckFormControl: FormControl<number | null>  = new FormControl<number | null>(0);
    /** {@link FormControl|`FormControl`} for the slider input for {@link SystemSettings#unavailableTimeout|`SystemSettings.unavailableTimeout`}. */
    protected unavailableFormControl: FormControl<number | null>  = new FormControl<number | null>(5);

    /** The status of the request for loading the {@link SettingsComponent#settings|`settings`}. */
    protected loadingStatus: LoadingStatus = LoadingStatus.LOADING;
    /** The url in the assets folder of a random time-related icon for the loading screen. */
    protected randomIcon: string           = Math.random() > 0.5 ? 'clock.svg' : 'hourglass.svg';

    /** The {@link SystemSettings|`SystemSettings`} currently in use. */
    protected settings: SystemSettings = SystemSettings.fromJSON({
                                                                     homeName:           'Home',
                                                                     offlineCheck:       60,
                                                                     onlineCheck:        10,
                                                                     unavailableTimeout: 300,
                                                                     throttleTiming:     100
                                                                 });

    /** The {@link LocalSettings|`LocalSettings`} currently in use. */
    protected localSettings: LocalSettings;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {Router} router - The Angular router. Instantiated by dependency injection.
     * @param {BetterMatDialog} dialog - The dialog service. Instantiated by dependency injection.
     * @param {LocalStorageService} localStorageService - The local storage service. Instantiated by dependency injection.
     * @param {SystemService} systemService - The system service. Instantiated by dependency injection.
     * @param {MatSnackBar} snackBar - The snackbar service. Instantiated by dependency injection.
     */
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

    /**
     * Reloads all the data in the component. This resets the loaded {@link SettingsComponent#settings|`settings`}
     * and {@link SettingsComponent#localSettings|`localSettings`}. The function also handles the
     * {@link SettingsComponent#loadingStatus|`loadingStatus`}.
     */
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

    /**
     * Updates the inputs and the {@link SettingsComponent#settings|`settings`} property when new data is received from the server.
     *
     * @param {SystemSettings} settings - The new {@link SystemSettings|`SystemSettings`} data.
     */
    private newSettingsData(settings: SystemSettings): void {
        this.settings = settings;
        this.setNumberSlider(settings.offlineCheck, CHECK_OPTIONS, this.offlineCheckFormControl);
        this.setNumberSlider(settings.onlineCheck, CHECK_OPTIONS, this.onlineCheckFormControl);
        this.setNumberSlider(settings.unavailableTimeout, UNAVAILABLE_OPTIONS, this.unavailableFormControl);
    }

    /**
     * Performs the action linked to the {@link ToolbarButton|`ToolbarButton`}'s click.
     */
    protected toolbarClick(): void {
        void this.router.navigate(['system']);
    }

    /** Open a dialog asking for the new value for {@link SystemSettings#homeName|`SystemSettings.homeName`}, and updates it if successful. */
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

    /**
     * Open a dialog asking for the new value for {@link SystemSettings#offlineCheck|`SystemSettings.offlineCheck`}
     * or {@link SystemSettings#onlineCheck|`SystemSettings.onlineCheck`}, and updates it if successful.
     *
     * @param {boolean} online - If `true`, the edited value is for {@link SystemSettings#onlineCheck|`SystemSettings.onlineCheck`},
     *                           if `false`, the edited value is for {@link SystemSettings#offlineCheck|`SystemSettings.offlineCheck`}.
     */
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

    /**
     * Update the {@link SystemSettings#offlineCheck|`SystemSettings.offlineCheck`} value, change the
     * {@link SettingsComponent#offlineCheckFormControl|`offlineCheckFormControl`} and send new settings to the server.
     *
     * @param {number} result - The new value for {@link SystemSettings#offlineCheck|`SystemSettings.offlineCheck`}.
     */
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

    /**
     * Update the {@link SystemSettings#onlineCheck|`SystemSettings.onlineCheck`} value, change the
     * {@link SettingsComponent#onlineCheckFormControl|`onlineCheckFormControl`} and send new settings to the server.
     *
     * @param {number} result - The new value for {@link SystemSettings#onlineCheck|`SystemSettings.onlineCheck`}.
     */
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

    /**
     * Open a dialog asking for the new value for {@link SystemSettings#unavailableTimeout|`SystemSettings.unavailableTimeout`},
     * and updates it if successful.
     */
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

    /**
     * Update the {@link SystemSettings#unavailableTimeout|`SystemSettings.unavailableTimeout`} value, change the
     * {@link SettingsComponent#unavailableFormControl|`unavailableFormControl`} and send new settings to the server.
     *
     * @param {number} result - The new value for {@link SystemSettings#unavailableTimeout|`SystemSettings.unavailableTimeout`}.
     */
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

    /**
     * Open a dialog asking for the new value for {@link SystemSettings#throttleTiming|`SystemSettings.throttleTiming`},
     * and updates it if successful.
     */
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

    /**
     * Update the {@link SystemSettings#throttleTiming|`SystemSettings.throttleTiming`} value and send new settings
     * to the server.
     *
     * @param {number} result - The new value for {@link SystemSettings#throttleTiming|`SystemSettings.throttleTiming`}.
     */
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

    /** Persist the new changes to {@link SettingsComponent#localSettings|`localSettings`}. */
    private saveLocalSettings(): void {
        this.localStorageService.setItem(LOCAL_SETTINGS_KEY, this.localSettings);
    }

    /**
     * Update the {@link LocalSettings#startPage|`startPage`} value in the {@link SettingsComponent#localSettings|`localSettings`}.
     *
     * @param {MainPages} page - The new value for {@link LocalSettings#startPage|`startPage`}.
     * @protected
     */
    protected changeStartPage(page: MainPages): void {
        this.localSettings.startPage = page;
        this.saveLocalSettings();
    }

    /**
     * Update the {@link LocalSettings#deviceViewLayoutTree|`deviceViewLayoutTree`} value in the
     * {@link SettingsComponent#localSettings|`localSettings`}.
     *
     * @param {boolean} [isTree] - The new value for the layout. If omitted, the value is toggled.
     */
    protected changeDevicesLayout(isTree?: boolean): void {
        isTree ??= !this.localSettings.deviceViewLayoutTree;
        if (this.localSettings.deviceViewLayoutTree != isTree) {
            this.localSettings.deviceViewLayoutTree = isTree;
        }
        this.saveLocalSettings();
    }

    /**
     * Update the {@link LocalSettings#darkMode|`darkMode`} value in the {@link SettingsComponent#localSettings|`localSettings`}
     * and apply the theme to the document.
     *
     * @param {boolean} [dark] - The new value for the dark mode. If omitted, the value is toggled.
     */
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

    /**
     * Move a slider to the nearest step value to an actual value.
     *
     * @param {number} value - The value to be represented on the slider.
     * @param {number[]} stepPositions - The values for the various steps, where to round to.
     * @param {FormControl<number | null>} sliderFormControl - The {@link FormControl|`FormControl`} for the slider.
     */
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

    /**
     * Transform a value in seconds into a readable display string.
     *
     * @param {number} seconds - The value in seconds.
     * @returns {string} A string containing the value of `seconds` in a huma readable format..
     */
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

    /**
     * Casts a `string` to a {@link ToolbarAction|`ToolbarAction`}.
     * Does not check for the real existence of an action with such name.
     *
     * @param {string} val - The string representation of a {@link ToolbarAction|`ToolbarAction`}.
     * @returns {ToolbarAction} `val` cast as {@link ToolbarAction|`ToolbarAction`}.
     */
    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

    /** @ignore */
    protected readonly ALL_TOOLBAR_ELEMENTS = ALL_TOOLBAR_ELEMENTS;
    /** @ignore */
    protected readonly MainPages     = MainPages;
    /** @ignore */
    protected readonly LoadingStatus = LoadingStatus;
}

/**
 * All the actions {@link SettingsComponent|`SettingsComponent`}'s {@link ToolbarComponent|`ToolbarComponent`} can offer.
 * Used as {@link ToolbarButton#id|`id`} for the {@link ALL_TOOLBAR_ELEMENTS|toolbar buttons}.
 *
 * @notExported
 */
enum ToolbarAction {
    /** The back button. */
    BACK = 'back',
}


/**
 * All the {@link ToolbarElement|`ToolbarElement`s} in {@link SettingsComponent|`SettingsComponent`}'s {@link ToolbarComponent|`ToolbarComponent`}.
 *
 * @notExported
 */
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

/**
 * Slider values for {@link SystemSettings#offlineCheck|`SystemSettings.offlineCheck`} and {@link SystemSettings#onlineCheck|`SystemSettings.onlineCheck`}.
 *
 * @notExported
 */
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

/**
 * Slider values for {@link SystemSettings#unavailableTimeout|`SystemSettings.unavailableTimeout`}.
 *
 * @notExported
 */
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

/**
 * This is a representation of all the settings and customization regarding the current browser session.
 * These are the settings that can be changed in the {@link SettingsComponent|`SettingsComponent`}
 * view in the frontend, but are only the subset of those that remain local to the system.
 */
export interface LocalSettings {
    /** The view to be shown when the browser page is first loaded with a blank link. */
    startPage: MainPages,
    /** Whether the {@link HomeComponent|`HomeComponent`} should display the devices and groups in a tree structure. */
    deviceViewLayoutTree: boolean,
    /** If the UI should be in dark mode. */
    darkMode: boolean,
    /** The cahced name of the home the system is attached to. It's the name seen in the header of any frontend page. */
    homeName: string,
}

/** The key for saving {@link SettingsComponent#localSettings|`localSettings`} in the {@link LocalStorageService|`LocalStorageService`}. */
export
/** The key for saving {@link SettingsComponent#localSettings|`localSettings`} in the {@link LocalStorageService|`LocalStorageService`}. */
const LOCAL_SETTINGS_KEY: LocalStorageObject<LocalSettings> = {
    name:         'localSettings',
    defaultValue: {
        startPage:            MainPages.DEVICES,
        deviceViewLayoutTree: false,
        darkMode:             false,
        homeName:             'Home'
    }
};
