import {Router, Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {MixComponent} from './components/mixing/mix/mix.component';
import {SystemComponent} from './components/system/system.component';
import {MixingComponent} from './components/mixing/mixing.component';
import {LOCAL_SETTINGS_KEY, SettingsComponent} from './components/system/settings/settings.component';
import {Component} from '@angular/core';
import {LocalStorageService} from './services/local-storage.service';
import {MainPages} from './utils/constants';


@Component({
               selector: 'house-mix-default-redirect',
               template: ''
           })
export class DefaultRedirectComponent {


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

export const routes: Routes = [
    {path: '', component: DefaultRedirectComponent, pathMatch: 'full'}, //default route
    {path: 'devices', component: HomeComponent},
    {path: 'mixing', component: MixingComponent},
    {path: 'mixing/edit/:mixId', component: MixComponent},
    {path: 'system', component: SystemComponent},
    {path: 'system/settings', component: SettingsComponent},
    {path: '**', redirectTo: ''}
];
