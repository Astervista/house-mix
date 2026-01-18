import { Component } from '@angular/core';
import { Route, Router } from '@angular/router';

@Component({
  selector: 'house-mix-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

    constructor(private router: Router) {}

    protected goTo(section: string): void {
        void this.router.navigate([section])
    }
}
