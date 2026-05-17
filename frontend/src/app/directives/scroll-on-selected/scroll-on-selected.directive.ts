/**
 * This module contains the {@link ScrollOnSelectedDirective|`ScrollOnSelectedDirective`}.
 *
 * @module
 */
import {Directive, ElementRef, Input} from '@angular/core';

/**
 * This directive scroll an element into view when its selected status passed to the directive changes to `true`.
 *
 * @directive
 * @directiveName `[house-mix-scroll-on-selected]`
 */
@Directive({
               selector: '[house-mix-scroll-on-selected]'
           })
export class ScrollOnSelectedDirective {

    /**
     * When this value is set to `true`, the element gets scrolled into view.
     *
     * @input
     * @inputAlias `house-mix-scroll-on-selected`
     */
    @Input('house-mix-scroll-on-selected')
    public set selected(value: boolean) {
        if (value && this.elementRef?.nativeElement != null) {
            this.elementRef.nativeElement.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
    }

    /**
     * Creates an instance of the directive. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ElementRef<HTMLElement | undefined>} elementRef - The reference to the element that the directive is attached to.
     */
    constructor(
        public elementRef?: ElementRef<HTMLElement | undefined>
    ) { }

}
