/**
 * This module contains the main {@link AppComponent|`AppComponent`}.
 *
 * @module
 */
import {AfterViewInit, Component, isDevMode} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DynamicSvgComponent} from './components/auxiliary/dynamic-svg/dynamic-svg.component';
import {LocalStorageService} from './services/local-storage.service';
import {LOCAL_SETTINGS_KEY} from './components/system/settings/settings.component';
import {SystemService} from './services/system.service';
import {Title} from '@angular/platform-browser';
import {SystemSettings} from '@common/system/settings/settings';
import {COPY_STORAGE_KEY} from './components/mixing/mix/mix.component';

/**
 * The main component in the app, shown in the root of the page, and from which every other screen starts.
 *
 * @component
 * @componentSelector `<house-mix-root>`
 */
@Component({
               selector:    'house-mix-root',
               imports: [RouterOutlet, DynamicSvgComponent],
               templateUrl: './app.component.html',
               styleUrl:    './app.component.scss'
           })
export class AppComponent implements AfterViewInit {

    /** The title of the app. */
    public title = 'HouseMix';
    /** The name of the house, to be shown in the title. */
    public houseName = 'Home';

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {LocalStorageService} localStorageService - The local storage service. Instantiated by dependency injection.
     * @param {SystemService} systemService - The system service. Instantiated by dependency injection.
     * @param {Title} titleService - The title service. Instantiated by dependency injection.
     */
    constructor(
        private localStorageService: LocalStorageService,
        private systemService: SystemService,
        private titleService: Title
    ) {
        const cached = localStorageService.getItem(LOCAL_SETTINGS_KEY);
        this.title   = `HouseMix - ${cached.homeName}`;
        titleService.setTitle(this.title);
        this.houseName = cached.homeName;
        this
            .systemService
            .getSettings()
            .then(settings => {
                this.updatedSettings(settings);
            })
            .catch(() => {
                this.title = `HouseMix - ${cached.homeName}`;
            });

        this
            .systemService
            .observeSettingsChanges()
            .subscribe(settings => {
                this.updatedSettings(settings);
            });
        this.localStorageService.setItem(COPY_STORAGE_KEY, null);
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
    public ngAfterViewInit(): void {
        if (typeof window !== 'undefined') {
            if (isDevMode()) {
                (window as unknown as {killSplash: () => void}).killSplash();
            }
        }
    }

    /**
     * Receive the new value of {@link SystemSettings|`SystemSettings`}.
     *
     * @param {SystemSettings} settings - The new value of {@link SystemSettings|`SystemSettings`}.
     */
    private updatedSettings(settings: SystemSettings): void {
        this.title = `HouseMix - ${settings.homeName}`;
        this.titleService.setTitle(this.title);
        this.houseName     = settings.homeName;
        const newCached    = this.localStorageService.getItem(LOCAL_SETTINGS_KEY);
        newCached.homeName = settings.homeName;
        this.localStorageService.setItem(LOCAL_SETTINGS_KEY, newCached);
    }

}
