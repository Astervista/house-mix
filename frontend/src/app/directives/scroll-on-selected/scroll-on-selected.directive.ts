import {Directive, ElementRef, Input} from '@angular/core';

@Directive({
               selector: '[house-mix-scroll-on-selected]'
           })
export class ScrollOnSelectedDirective {

    @Input('house-mix-scroll-on-selected')
    public set selected(value: boolean) {
        if (value && this.elementRef?.nativeElement != null) {
            this.elementRef.nativeElement.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
    }

    constructor(
        public elementRef?: ElementRef<HTMLElement | undefined>
    ) { }

}
