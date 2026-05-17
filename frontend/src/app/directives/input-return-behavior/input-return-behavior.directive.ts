/**
 * This module contains classes to handle the return behavior in forms.
 *
 * @module
 */
import {AfterViewInit, Directive, ElementRef, EventEmitter, OnDestroy, Output} from '@angular/core';

/**
 * This directive is used on focusable elements that need to be ignored and
 * as such skipped by the {@link InputReturnBehaviorDirective|`InputReturnBehaviorDirective`}.
 *
 * @directive
 * @directiveName `[house-mix-input-return-behavior-exclude]`
 */
@Directive({
               selector: '[house-mix-input-return-behavior-exclude]'
           })
export class InputReturnBehaviorExcludeDirective {

    /**
     * Creates an instance of the directive. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ElementRef<HTMLElement>} el - The reference to the element that the directive is attached to. Instantiated by dependency injection.
     */
    constructor(private el: ElementRef<HTMLElement>) {
        this.el.nativeElement.setAttribute('data-exclude-from-parent', 'true');
    }
}

/**
 * This directive can be added to any container in a template and enhances the behavior of
 * all the focusable children of such a container. The added behavior is focusing the next
 * focusable child element upon the user pressing the return key on a focused child.
 *
 * The directive also has an output `[on-stop]` that emits when the return key is pressed
 * on the last focusable element.
 *
 * @directive
 * @directiveName ´[house-mix-input-return-behavior]`
 */
@Directive({
               selector: '[house-mix-input-return-behavior]'
           })
export class InputReturnBehaviorDirective implements AfterViewInit, OnDestroy {

    /**
     * The output that emits when the return key is pressed on the last focusable element.
     *
     * @output
     * @outputAlias on-stop
     */
    @Output('on-stop')
    public onStop: EventEmitter<void> = new EventEmitter<void>();

    /** The registered listeners for the keydown event on the elements. */
    private listeners: (() => void)[] = [];
    /** The {@link MutationObserver|`MutationObserver`} watching the {@link InputReturnBehaviorDirective#host|`host`} element for new inputs. */
    private observer?: MutationObserver;
    /** All the focusable elements found in the {@link InputReturnBehaviorDirective#host|`host`} element. */
    private focusable: HTMLElement[]  = [];

    /**
     * Creates an instance of the directive. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ElementRef<HTMLElement>} host - The reference to the element that the directive is attached to and will observe for
     *                                         focusable children. Instantiated by dependency injection.
     */
    constructor(private host: ElementRef<HTMLElement>) {}

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
    public ngAfterViewInit(): void {
        this.observeContainer();
        this.attachListeners();
    }

    /**
     * Implementation of {@link OnDestroy#ngOnDestroy| `OnDestroy.ngOnDestroy()`}.
     */
    public ngOnDestroy(): void {
        this.cleanupListeners();
        this.observer?.disconnect();
    }

    /** Setup the {@link InputReturnBehaviorDirective#observer|`observer`}. */
    private observeContainer(): void {
        this.observer = new MutationObserver(() => {
            this.cleanupListeners();
            this.attachListeners();
        });

        this.observer.observe(this.host.nativeElement, {
            childList:       true,        // new or removed children
            subtree:         true,          // watch the whole subtree
            attributes:      true,       // detect changes to attributes like disabled
            attributeFilter: ['tabindex', 'disabled', 'hidden', 'style']
        });
    }

    /** Find the focusable elements in the {@link InputReturnBehaviorDirective#host|`host`} element and attach the keydown listener to them. */
    private attachListeners(): void {

        this.focusable = getTabbableElements(this.host.nativeElement);

        this.focusable.forEach(el => {
            const listener = (event: KeyboardEvent): void => {
                this.handleKeyDown(event, this.focusable[this.focusable.indexOf(el) + 1] ?? null, this.focusable[this.focusable.indexOf(el) - 1] ?? null);
            };
            el.addEventListener('keydown', listener, {capture: true});
            this.listeners.push(() => {el.removeEventListener('keydown', listener);});
        });
    }

    /** Unregister the {@link InputReturnBehaviorDirective#listeners|`listeners`} set up in {@link InputReturnBehaviorDirective#attachListeners| `attachListeners()`}. */
    private cleanupListeners(): void {
        this.listeners.forEach(remove => {remove();});
        this.listeners = [];
    }

    /**
     * Handle the keydown event on a focusable child of the {@link InputReturnBehaviorDirective#host|`host`} element.
     *
     * @param {KeyboardEvent} event - The DOM event.
     * @param {HTMLElement | null} next - The next focusable element in line. `null` if this is the last.
     * @param {HTMLElement | null} prev - The previous focusable element in line. `null` if this is the first.
     */
    public handleKeyDown(event: KeyboardEvent, next: HTMLElement | null, prev: HTMLElement | null): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.shiftKey) {
                if (prev) {
                    prev.focus();
                }
            } else {
                if (next) {
                    next.focus();
                } else {
                    this.onStop.emit();
                }
            }
        }
    }

}

/**
 * Get all the children of an {@link HTMLElement|`HTMLElement`} that can be focused by tabbing.
 *
 * This function is a fast heuristic to find the elements, and uses this selector:
 * ```css
 *     a[href],
 *     button:not([disabled]),
 *     input:not([disabled]),
 *     select:not([disabled]),
 *     textarea:not([disabled]),
 *     [tabindex]
 * ```
 * to find the candidates, and ignores the hidden ones, the ones with a negative `tabindex`, and the ones
 * marked by the {@link InputReturnBehaviorExcludeDirective|`InputReturnBehaviorExcludeDirective`} or in
 * some other ways with `[data-exclude-from-parent=true]`.
 *
 * @param {HTMLElement} host - The container to find the elements in.
 * @returns {HTMLElement} All the tabbable children of `host`.
 */
function getTabbableElements(host: HTMLElement): HTMLElement[] {
    const selector = `
    a[href],
    button:not([disabled]),
    input:not([disabled]),
    select:not([disabled]),
    textarea:not([disabled]),
    [tabindex]
  `;

    const elements = Array.from(
        host.querySelectorAll<HTMLElement>(selector)
    );

    return elements
        .filter(el => {
            if (el.tabIndex < 0) {
                return false;
            }
            if (el.hidden) {
                return false;
            }
            if (el.getAttribute('data-exclude-from-parent') == 'true') {
                return false;
            }
            if (getComputedStyle(el).visibility === 'hidden') {
                return false;
            }
            return getComputedStyle(el).display !== 'none';

        })
        .sort((a, b) => {
            if (a.tabIndex === b.tabIndex) {
                return 0;
            }
            if (a.tabIndex === 0) {
                return 1;
            }
            if (b.tabIndex === 0) {
                return -1;
            }
            return a.tabIndex - b.tabIndex;
        });
}
