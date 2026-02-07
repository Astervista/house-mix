import {AfterViewInit, Component, isDevMode} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DynamicSvgComponent} from './components/auxiliary/dynamic-svg/dynamic-svg.component';

@Component({
               selector:    'house-mix-root',
               imports: [RouterOutlet, DynamicSvgComponent],
               templateUrl: './app.component.html',
               styleUrl:    './app.component.scss'
           })
export class AppComponent implements AfterViewInit {
    public title = 'HouseMix';

    public ngAfterViewInit(): void {
        if (typeof window !== 'undefined') {
            if (isDevMode()) {
                (window as unknown as {killSplash: () => void}).killSplash();
            }
        }
    }

}
