import {Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {MixComponent} from './components/mixing/mix/mix.component';
import {SystemComponent} from './components/system/system.component';
import {MixingComponent} from './components/mixing/mixing.component';

export const routes: Routes = [
    {path: '', redirectTo: 'home', pathMatch: 'full'}, //default route
    {path: 'home', component: HomeComponent},
    {path: 'mixing', component: MixingComponent},
    {path: 'mixing/edit/:mixId', component: MixComponent},
    {path: 'system', component: SystemComponent},
];
