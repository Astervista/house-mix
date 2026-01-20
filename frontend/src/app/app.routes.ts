import {Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {MixComponent} from './components/mixing/mix/mix.component';

export const routes: Routes = [
    {path: '', redirectTo: 'home', pathMatch: 'full'}, //default route
    {path: 'home', component: HomeComponent},
    {path: 'mix', component: MixComponent},
];
