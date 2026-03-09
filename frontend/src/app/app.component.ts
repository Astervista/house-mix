import {AfterViewInit, Component, isDevMode} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DynamicSvgComponent} from './components/auxiliary/dynamic-svg/dynamic-svg.component';
import {LocalStorageService} from './services/local-storage.service';
import {LOCAL_SETTINGS_KEY} from './components/system/settings/settings.component';
import {SystemService} from './services/system.service';
import {Title} from '@angular/platform-browser';
import {SystemSettings} from '@common/system/settings/settings';
import {COPY_STORAGE_KEY} from './components/mixing/mix/mix.component';

@Component({
               selector:    'house-mix-root',
               imports: [RouterOutlet, DynamicSvgComponent],
               templateUrl: './app.component.html',
               styleUrl:    './app.component.scss'
           })
export class AppComponent implements AfterViewInit {

    public title = 'HouseMix';
    public houseName = 'Home';

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

    private updatedSettings(settings: SystemSettings): void {
        this.title = `HouseMix - ${settings.homeName}`;
        this.titleService.setTitle(this.title);
        this.houseName     = settings.homeName;
        const newCached    = this.localStorageService.getItem(LOCAL_SETTINGS_KEY);
        newCached.homeName = settings.homeName;
        this.localStorageService.setItem(LOCAL_SETTINGS_KEY, newCached);
    }

    public ngAfterViewInit(): void {
        if (typeof window !== 'undefined') {
            if (isDevMode()) {
                (window as unknown as {killSplash: () => void}).killSplash();
            }
        }
    }

}
