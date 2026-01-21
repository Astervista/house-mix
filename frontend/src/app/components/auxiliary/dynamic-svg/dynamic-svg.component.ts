import {Component, HostBinding, Input, ViewEncapsulation} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {HttpClient} from '@angular/common/http';
import {catchError, of} from 'rxjs';

@Component({
               selector: 'house-mix-dynamic-svg',
               imports:  [],
               template: '',
               styleUrl: './dynamic-svg.component.scss'
           })
export class DynamicSvgComponent {

    @Input() public set src(src: string | null) {
        if (this._src != src) {
            if (src == null) {
                this.svg = null;
            } else {
                const cached = DynamicSvgComponent.cache.get(src);
                if (cached != null) {
                    this.svg = cached;
                } else {
                    this.http
                        .get(src, {responseType: 'text'})
                        .pipe(
                            catchError(() => {
                                return of(null)
                            })
                        )
                        .subscribe(rawSvg => {
                            if (rawSvg == null) {
                                this.svg = null;
                                return;
                            }
                            const commentPos = rawSvg.indexOf("<!-- Dynamic SVG -->");
                            const svgPos = rawSvg.indexOf("<svg");
                            if (svgPos == -1) {
                                console.error("The provided file does not contain a svg tag. This file will not be displayed.")
                                return;
                            }
                            if ((commentPos == -1) || (commentPos > svgPos)) {
                                console.error("The svg must be a Dynamic SVG, marked with the comment '<!-- Dynamic SVG -->' at the beginning " +
                                              "of the file, after the xml definition tag and before the start of the svg code. The svg will not be displayed.");
                                return;
                            }
                            const safe = this.sanitizer.bypassSecurityTrustHtml(rawSvg);
                            DynamicSvgComponent.cache.set(src, safe);
                            this.svg = safe;
                        });
                }
            }
        }
        this._src = src;
    }

    private _src: string | null = null;

    @HostBinding('innerHTML')
    protected svg: SafeHtml | null = null;

    private static cache = new Map<string, SafeHtml>();

    constructor(
        private http: HttpClient,
        private sanitizer: DomSanitizer
    ) {}

}
