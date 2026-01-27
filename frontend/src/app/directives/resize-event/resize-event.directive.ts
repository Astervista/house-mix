import {ChangeDetectorRef, Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output} from "@angular/core";

@Directive({
               selector: "[resizeEvent]"
           })
export class ResizeEventDirective implements OnInit, OnDestroy {

    @Output() public onResize = new EventEmitter<ResizeEvent>();
    @Output() public onHorizontalScrollbarChange = new EventEmitter<boolean>();
    @Output() public onVerticalScrollbarChange = new EventEmitter<boolean>();

    private hasHorizontalScrollbars?: boolean;
    private hasVerticalScrollbars?: boolean;

    private resizeObserver: ResizeObserver | null = null;

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        private changeDetectorRef: ChangeDetectorRef) { }

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


    public ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    private emitResizeEvent(): void {
        this.onResize.emit({
            width: this.elementRef.nativeElement.offsetWidth,
            height: this.elementRef.nativeElement.offsetHeight,
            target: this.elementRef.nativeElement
        });
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

export interface ResizeEvent {
    width: number;
    height: number;
    target: HTMLElement;
}
