import {Component, HostBinding, Input} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {HttpClient} from '@angular/common/http';
import {catchError, firstValueFrom, of} from 'rxjs';
import {RESOURCE_ROOT} from '../../../utils/constants';

@Component({
               selector: 'house-mix-dynamic-svg',
               imports:  [],
               template: '',
               styleUrl: './dynamic-svg.component.scss'
           })
export class DynamicSvgComponent {

    @Input() public set src(src: string | null) {
        if (src != null) {
            src = RESOURCE_ROOT + src;
        }
        if (this._src != src) {
            if (src == null) {
                this.svg = null;
            } else {
                const cached = DynamicSvgComponent.cache.get(src);
                if (cached != null) {
                    cached
                        .then((cachedValue) => {
                            this.svg = cachedValue;
                        })
                        .catch(() => {
                            this.svg = null;
                        });
                } else {
                    const tempPromise =
                              firstValueFrom(
                                  this.http
                                      .get(src, {responseType: 'text'})
                                      .pipe(
                                          catchError(() => {
                                              return of(null);
                                          })
                                      )
                              )
                                  .then((rawSvg) => {
                                      if (rawSvg == null) {
                                          return null;
                                      }
                                      const commentPos = rawSvg.indexOf('<!-- Dynamic SVG -->');
                                      const svgPos     = rawSvg.indexOf('<svg');
                                      if (svgPos == -1) {
                                          console.error('The provided file does not contain a svg tag. This file will not be displayed.');
                                          return null;
                                      }
                                      if ((commentPos == -1) || (commentPos > svgPos)) {
                                          console.error('The svg must be a Dynamic SVG, marked with the comment \'<!-- Dynamic SVG -->\' at the beginning ' +
                                                        'of the file, after the xml definition tag and before the start of the svg code. The svg will not be displayed.');
                                          return null;
                                      }
                                      const safe = this.sanitizer.bypassSecurityTrustHtml(rawSvg);
                                      DynamicSvgComponent.cache.set(src, Promise.resolve(safe));
                                      return safe;
                                  })
                                  .catch(() => {
                                      return null;
                                  })
                                  .then((result) => {
                                      this.svg = result;
                                      return result;
                                  });
                    DynamicSvgComponent.cache.set(src, tempPromise);
                }
            }
        }
        this._src = src;
    }

    private _src: string | null = null;

    @HostBinding('innerHTML')
    protected svg: SafeHtml | null = null;

    private static cache = new Map<string, Promise<SafeHtml | null>>();

    constructor(
        private http: HttpClient,
        private sanitizer: DomSanitizer
    ) {}

}
