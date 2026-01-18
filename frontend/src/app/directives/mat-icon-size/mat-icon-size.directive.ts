import {Directive, HostBinding, Input} from "@angular/core";

@Directive({
               selector: "[matIconSize]"
           })
export class MatIconSizeDirective {
    
    @HostBinding("style.height.px")
    @HostBinding("style.width.px")
    @HostBinding("style.font-size.px")
    @Input("matIconSize") public size: number = 24;
    
}
