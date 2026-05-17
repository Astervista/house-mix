/**
 * This module contains the {@link ResizeEventDirective|`ResizeEventDirective`} and related classes.
 *
 * @module
 */
import {ChangeDetectorRef, Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output} from "@angular/core";

/**
 * This directive attaches observers to the element it's attached to and emits resize and scrollbar events as outputs.
 *
 * @directive
 * @directiveName `[resizeEvent]`
 */
@Directive({
               selector: "[resizeEvent]"
           })
export class ResizeEventDirective implements OnInit, OnDestroy {

    /**
     * This event emits every time the element is resized with the {@link ResizeEvent|`ResizeEvent`} data.
     *
     * @output
     */
    @Output() public onResize = new EventEmitter<ResizeEvent>();
    /**
     * This event emits every time the horizontal scrollbar visibility (horizontal overflow status) of the element changes, with `true` if the content overflows, and `false` otherwise.
     *
     * @output
     */
    @Output() public onHorizontalScrollbarChange = new EventEmitter<boolean>();
    /**
     * This event emits every time the vertical scrollbar visibility (vertical overflow status) of the element changes, with `true` if the content overflows, and `false` otherwise.
     *
     * @output
     */
    @Output() public onVerticalScrollbarChange = new EventEmitter<boolean>();

    /** Tracks the last known value of horizontal scrollbar visibility (horizontal overflow status). */
    private hasHorizontalScrollbars?: boolean;
    /** Tracks the last known value of vertical scrollbar visibility (vertical overflow status). */
    private hasVerticalScrollbars?: boolean;

    /** The {@link ResizeObserver|`ResizeObserver`} registered on the monitored element. */
    private resizeObserver: ResizeObserver | null = null;


    /**
     * Creates an instance of the directive. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ElementRef<HTMLElement | SVGElement>} elementRef - The reference to the element that the directive is attached to and will observe for
     *                                         resize event. Instantiated by dependency injection.
     * @param {ChangeDetectorRef} changeDetectorRef - The Angular change detection service. Instantiated by dependency injection.
     */
    constructor(
        private elementRef: ElementRef<HTMLElement | SVGElement>,
        private changeDetectorRef: ChangeDetectorRef) { }


    /** Implementation of {@link OnInit#ngOnInit| `OnInit.ngOnInit()`}. */
    public ngOnInit(): void {
        if (typeof ResizeObserver === "undefined") {
            return;
        }
        this.resizeObserver = new ResizeObserver(() => {
            this.emitResizeEvent();
        });

        this.resizeObserver.observe(this.elementRef.nativeElement);
        this.emitResizeEvent();
    }


    /** Implementation of {@link OnDestroy#ngOnDestroy| `OnDestroy.ngOnDestroy()`}. */
    public ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    /** Emits all the relevant outputs after a resize is detected. */
    private emitResizeEvent(): void {
        if (this.elementRef.nativeElement instanceof HTMLElement) {
            this.onResize.emit({
                                   width:  this.elementRef.nativeElement.offsetWidth ,
                                   height: this.elementRef.nativeElement.offsetHeight ,
                                   target: this.elementRef.nativeElement
                               });
        } else {
            this.onResize.emit({
                                   width:  this.elementRef.nativeElement.clientWidth,
                                   height: this.elementRef.nativeElement.clientHeight,
                                   target: this.elementRef.nativeElement
                               });
        }
        const newHasVerticalScrollbar = this.elementRef.nativeElement.scrollHeight > this.elementRef.nativeElement.clientHeight;
        if (newHasVerticalScrollbar != this.hasVerticalScrollbars) {
            this.hasVerticalScrollbars = newHasVerticalScrollbar;
            this.onVerticalScrollbarChange.emit(newHasVerticalScrollbar);
        }
        const newHasHorizontalScrollbar = this.elementRef.nativeElement.scrollWidth > this.elementRef.nativeElement.clientWidth;
        if (newHasHorizontalScrollbar != this.hasHorizontalScrollbars) {
            this.hasHorizontalScrollbars = newHasHorizontalScrollbar;
            this.onHorizontalScrollbarChange.emit(newHasHorizontalScrollbar);
        }
        this.changeDetectorRef.detectChanges();
    }
}

/** Information about a resize event detected by the {@link ResizeEventDirective|`ResizeEventDirective`}. */
export interface ResizeEvent {
    /** The new width. */
    width: number;
    /** The new height. */
    height: number;
    /** The element being monitored.. */
    target: HTMLElement | SVGElement;
}
