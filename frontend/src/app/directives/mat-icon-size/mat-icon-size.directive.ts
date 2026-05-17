/**
 * This module contains the {@link MatIconSizeDirective|`MatIconSizeDirective`}.
 *
 * @module
 */
import {Directive, HostBinding, Input} from "@angular/core";

// noinspection ES6UnusedImports
import type {MatIcon} from '@angular/material/icon';

/**
 * This directive sets a {@link MatIcon|`MatIcon`}'s size.
 *
 * @directive
 * @directiveName `[matIconSize]`
 */
@Directive({
               selector: "[matIconSize]"
           })
export class MatIconSizeDirective {

    /**
     * The size of the icon.
     *
     * @hostBinding style.height.px
     * @hostBinding style.width.px
     * @hostBinding style.font-size.px
     * @input
     * @inputAlias matIconSize
     */
    @HostBinding("style.height.px")
    @HostBinding("style.width.px")
    @HostBinding("style.font-size.px")
    @Input("matIconSize") public size: number = 24;

}
