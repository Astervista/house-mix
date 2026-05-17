/**
 * This module contains routing logic for the app.
 *
 * @module
 */
import {Router, Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {MixComponent} from './components/mixing/mix/mix.component';
import {SystemComponent} from './components/system/system.component';
import {MixingComponent} from './components/mixing/mixing.component';
import {LOCAL_SETTINGS_KEY, SettingsComponent} from './components/system/settings/settings.component';
import {Component} from '@angular/core';
import {LocalStorageService} from './services/local-storage.service';
import {MainPages} from './utils/constants';

/**
 * The main route redirection component.
 *
 * @component
 * @componentSelector `<house-mix-default-redirect>`
 */
@Component({
               selector: 'house-mix-default-redirect',
               template: ''
           })
export class DefaultRedirectComponent {

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {Router} router - The Angular router. Instantiated by dependency injection.
     * @param {LocalStorageService} localStorageService - The local storage service. Instantiated by dependency injection.
     */
    constructor(
        private router: Router,
        private localStorageService: LocalStorageService
    ) {
        const settings = this.localStorageService.getItem(LOCAL_SETTINGS_KEY);
        let startPage;
        switch (settings.startPage) {
            case MainPages.DEVICES:
                startPage = 'devices';
                break;
            case MainPages.MIXING:
                startPage = 'mixing';
                break;
            case MainPages.SYSTEM:
                startPage = 'system';
                break;
        }
        void this.router.navigate([startPage]);
    }

}

/**
 * All the routes in the system.
 */
export
/**
 * All the routes in the system.
 */
const routes: Routes = [
    {path: '', component: DefaultRedirectComponent, pathMatch: 'full'}, //default route
    {path: 'devices', component: HomeComponent},
    {path: 'mixing', component: MixingComponent},
    {path: 'mixing/edit/:mixId', component: MixComponent},
    {path: 'system', component: SystemComponent},
    {path: 'system/settings', component: SettingsComponent},
    {path: '**', redirectTo: ''}
];
