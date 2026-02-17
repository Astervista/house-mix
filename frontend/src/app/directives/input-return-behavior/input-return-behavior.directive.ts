import {AfterViewInit, Directive, ElementRef, EventEmitter, OnDestroy, Output} from '@angular/core';

@Directive({
               selector: '[house-mix-input-return-behavior]'
           })
export class InputReturnBehaviorDirective implements AfterViewInit, OnDestroy {

    @Output('on-stop')
    public onStop: EventEmitter<void> = new EventEmitter<void>();

    private listeners: (() => void)[] = [];
    private observer?: MutationObserver;
    private focusable: HTMLElement[]  = [];

    constructor(private host: ElementRef<HTMLElement>) {}

    public ngAfterViewInit(): void {
        this.observeContainer();
        this.attachListeners();
    }

    public ngOnDestroy(): void {
        this.cleanupListeners();
        this.observer?.disconnect();
    }

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

    private cleanupListeners(): void {
        this.listeners.forEach(remove => {remove();});
        this.listeners = [];
    }

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
            if (getComputedStyle(el).visibility === 'hidden') {
                return false;
            }
            if (getComputedStyle(el).display === 'none') {
                return false;
            }
            return true;
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
