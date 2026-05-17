/**
 *  This module contains the {@link DynamicSvgComponent|`DynamicSvgComponent`} and related classes.
 *
 *  @module
 */
import {Component, HostBinding, Input} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {HttpClient} from '@angular/common/http';
import {catchError, firstValueFrom, of} from 'rxjs';
import {RESOURCE_ROOT} from '../../../utils/constants';

/**
 * This component displays an SVG image file by inserting it into the DOM, so that
 * styles from the page can affect its appearance.
 *
 * The image is set through the {@link DynamicSvgComponent|`src`} input, which accepts
 * an url relative to the {@link RESOURCE_ROOT|`RESOURCE_ROOT`}. The svg gets fetched,
 * sanitized and inserted into the DOM as the inner html of the component.
 *
 * The SVG file can start with the `<?xml/>` tag, but it's accepted only if it contains
 * the `<svg>` tag, and a `<!-- Dynamic SVG -->` comment before it. Otherwise, an error
 * is thrown and nothing gets displayed.
 *
 * The component does not check for correctness of the SVG file, nor does it check if
 * other HTML tags are present in the file, so it may render more than an SVG usually
 * does. Use only on files of known origin (although the HTML still gets sanitized by
 * Angular, so it should be secure).
 *
 * The component also handles simple in-memory caching to avoid multiple of the same
 * requests for the same resource, but requests are performed at every reload.
 *
 * @example Simple use.
 *
 * The file with address `/assets/clock.svg` contains the following SVG:
 * ```
 * <?xml version="1.0" encoding="UTF-8"?>
 * <!-- Dynamic SVG -->
 * <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 100 100">
 *     <defs>
 *         <style>
 *             .stroked {
 *                 fill: none;
 *                 stroke: var(--my-awesome-color, #000);
 *                 stroke-width: 4.5px;
 *             }
 *         </style>
 *     </defs>
 *     <path class="stroked" d="M59.624,6.748c19.839,4.395,34.676,22.091,34.676,43.252,0,24.466-19.834,44.3-44.3,44.3S5.7,74.466,5.7,50,25.534,5.7,50,5.7v44.3l16.17,16.17"/>
 *     <line class="stroked" x1="11.8" y1="50" x2="21.8" y2="50"/>
 *     <line class="stroked" x1="50" y1="88.2" x2="50" y2="78.2"/>
 *     <line class="stroked" x1="88.2" y1="50" x2="78.2" y2="50"/>
 * </svg>
 * ```
 *
 * The element is instantiated like any angular component:
 * ```html
 * <house-mix-dynamic-svg [src]="/assets/clock.svg"></house-mix-dynamic-svg>
 * ```
 *
 * Now, if a global CSS defines the custom property --my-awesome-color:
 * ```css
 * body {
 *     --my-awesome-color: aliceblue
 * }
 * ```
 * the stroke of the paths and lines in the SVG should change stroke color.
 *
 * @component
 * @componentSelector `<house-mix-dynamic-svg>`
 */
@Component({
               selector: 'house-mix-dynamic-svg',
               imports:  [],
               template: '',
               styleUrl: './dynamic-svg.component.scss'
           })
export class DynamicSvgComponent {

    /**
     * The path where the SVG to be displayed is located,
     * relative to the {@link RESOURCE_ROOT|`RESOURCE_ROOT`}.
     *
     * @input
     */
    @Input()
    public set src(src: string | null) {
        if (src != null) {
            src = RESOURCE_ROOT + src;
            src = src.replace(/^\/+/g, '/');
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

    /**
     * The path where the SVG to be displayed is located,
     * relative to the {@link RESOURCE_ROOT|`RESOURCE_ROOT`}.
     */
    private _src: string | null = null;

    /**
     * The SVG parsed as {@link SafeHtml|`SafeHtml`}, bound to the
     * `innerHtml` of the component.
     *
     * @hostBinding innerHTML
     */
    @HostBinding('innerHTML')
    protected svg: SafeHtml | null = null;

    /**
     * The cache containing the responses for all the SVGs correctly fetched,
     * to reuse if multiple of this component are instantiated with the same
     * src. They are stored in this map as the original {@link Promise|`Promise`}
     * that elaborated them, so that they can be used right away.
     */
    private static cache = new Map<string, Promise<SafeHtml | null>>();

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {HttpClient} http - An instance of {@link HttpClient|`HttpClient`}. Instantiated by dependency injection.
     * @param {DomSanitizer} sanitizer - An instance of {@link DomSanitizer|`DomSanitizer`}. Instantiated by dependency injection.
     */
    constructor(
        private http: HttpClient,
        private sanitizer: DomSanitizer
    ) {}

}
