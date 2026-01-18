import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {MatDatepickerModule} from '@angular/material/datepicker';

@Component({
               selector:    'house-mix-root',
               imports:     [RouterOutlet],
               templateUrl: './app.component.html',
               styleUrl:    './app.component.scss'
           })
export class AppComponent {
    public title = 'HouseMix';
}
