import {AfterViewInit, Component, ElementRef, forwardRef, Input, ViewChild} from '@angular/core';
import {ControlValueAccessor, FormControl, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ColorSpace} from '@common/utils/color-convert';
import {kelvinToXY} from '@common/utils/color-convert-table';
import {DEFAULT_TEMP, MAX_ALLOWED_TEMP, MIN_ALLOWED_TEMP} from '@common/utils/constants';

@Component({
               selector:    'house-mix-color-temp-picker',
               imports:     [
                   ReactiveFormsModule,
                   MatFormFieldModule,
                   MatInputModule,
                   FormsModule
               ],
               providers:   [
                   {
                       provide:     NG_VALUE_ACCESSOR,
                       useExisting: forwardRef(() => ColorTempPickerComponent),
                       multi:       true
                   }
               ],
               templateUrl: './color-temp-picker.component.html',
               styleUrl:    './color-temp-picker.component.scss'
           })
export class ColorTempPickerComponent implements AfterViewInit, ControlValueAccessor {
    @Input()
    public set formControl(formControl: FormControl<number | null>) {

        this._formControl = formControl;
        if (formControl.value == null) {
            formControl.setValue(DEFAULT_TEMP);
        }
    }

    protected _formControl: FormControl<number | null> = new FormControl<number | null>(DEFAULT_TEMP);

    @ViewChild('canvas')
    private canvas!: ElementRef<HTMLCanvasElement>;
    private ctx!: CanvasRenderingContext2D;
    private imageData!: ImageData;
    private ctxWidth!: number;
    private ctxHeight!: number;

    public writeValue(temp: number): void {
        if (this._formControl.value != temp) {
            this._formControl.setValue(temp, {emitEvent: false});
        }
    }

    constructor() {
        this._formControl.valueChanges.subscribe(value => {
            if (this.onChange != null && value != null) {
                this.onChange(value);
            }
            if (this.onTouched != null) {
                this.onTouched();
            }
        });
    }


    protected onChange: ((value: number) => void) | null = null;

    public registerOnChange(fn: (value: number) => void): void {
        this.onChange = fn;
    }

    protected onTouched: (() => void) | null = null;

    public registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }


    protected disabled: boolean = false;

    public setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
        if (isDisabled) {
            this._formControl.disable();
        } else {
            this._formControl.enable();
        }
    }

    public ngAfterViewInit(): void {
        const ctx = this.canvas.nativeElement.getContext('2d');
        if (ctx) {
            this.ctx       = ctx;
            this.ctxWidth  = ctx.canvas.width = this.canvas.nativeElement.offsetWidth * window.devicePixelRatio;
            this.ctxHeight = ctx.canvas.height = this.canvas.nativeElement.offsetHeight * window.devicePixelRatio;
            this.imageData = ctx.createImageData(this.ctxWidth, this.ctxHeight);
        }
        this.repaint();
    }

    public repaint(): void {
        for (let x = 0; x < this.ctxWidth; x++) {
            const mired   = (1000000 / MIN_ALLOWED_TEMP) - (x / this.ctxWidth) * (1000000 / MIN_ALLOWED_TEMP - 1000000 / MAX_ALLOWED_TEMP);
            const temp    = 1000000 / mired;
            const colorXY = kelvinToXY(temp);
            const color   = ColorSpace.sRGB.colorFromXYY(colorXY.x, colorXY.y, 0.75, true);
            for (let y = 0; y < this.ctxHeight; y++) {
                this.imageData.data[(x + y * this.ctxWidth) * 4]     = color.r * 255;
                this.imageData.data[(x + y * this.ctxWidth) * 4 + 1] = color.g * 255;
                this.imageData.data[(x + y * this.ctxWidth) * 4 + 2] = color.b * 255;
                this.imageData.data[(x + y * this.ctxWidth) * 4 + 3] = 255;
            }
        }
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    protected get currentSliderPos(): number {
        const temp  = this.safeValue;
        const mired = 1000000 / temp;
        return (1000000 / MIN_ALLOWED_TEMP - mired) / (1000000 / MIN_ALLOWED_TEMP - 1000000 / MAX_ALLOWED_TEMP);
    }

    protected dragging: null | 'HORZ'        = null;
    protected draggingBounds: DOMRect | null = null;

    protected mouseDown(event: MouseEvent): void {
        if (this.dragging == null && event.button == 0) {
            this.dragging       = 'HORZ';
            this.draggingBounds = (event.target as Element | null)?.getBoundingClientRect() ?? null;
            this.mouseMove(event);
        }
    }

    protected mouseMove(event: MouseEvent): void {
        const rect = this.draggingBounds;
        if (rect === null) {
            return;
        }
        const x     = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        const mired = 1000000 / MIN_ALLOWED_TEMP - x * (1000000 / MIN_ALLOWED_TEMP - 1000000 / MAX_ALLOWED_TEMP);
        const temp  = 1000000 / mired;
        this._formControl.setValue(Math.round(temp));
    }

    protected mouseUp(event: MouseEvent): void {
        if (this.dragging == 'HORZ') {
            this.mouseMove(event);
            this.dragging = null;
        }
    }


    protected key(event: KeyboardEvent): void {
        let x = ((this._formControl.value ?? DEFAULT_TEMP) - MIN_ALLOWED_TEMP) / (MAX_ALLOWED_TEMP - MIN_ALLOWED_TEMP);
        if (event.key == 'ArrowRight') {
            x += (event.shiftKey ? 2 : (event.altKey ? 0.5 : 1)) * 10 / 360;
            if (x > 1) {
                x = 1;
            }
        } else if (event.key == 'ArrowLeft') {
            x -= (event.shiftKey ? 2 : (event.altKey ? 0.5 : 1)) * 10 / 360;
            if (x < 0) {
                x = 0;
            }
        } else if (event.key == 'Home') {
            x = 0;
        } else if (event.key == 'End') {
            x = 1;
        } else {
            return;
        }
        this._formControl.setValue(Math.round(MIN_ALLOWED_TEMP + x * (MAX_ALLOWED_TEMP - MIN_ALLOWED_TEMP)));
    }

    protected scrimMouseMove(event: MouseEvent): void {
        if (this.dragging == 'HORZ') {
            this.mouseMove(event);
        }
    }

    protected scrimMouseUp(event: MouseEvent): void {
        if (this.dragging == 'HORZ') {
            this.mouseUp(event);
        }
    }

    protected getStyleColor(): string {
        const temp    = this.safeValue;
        const colorXY = kelvinToXY(temp);
        const color   = ColorSpace.sRGB.colorFromXYY(colorXY.x, colorXY.y, 0.75, false);
        return color.toCSS();
    }

    protected get safeValue(): number {
        return Math.min(MAX_ALLOWED_TEMP, Math.max(MIN_ALLOWED_TEMP, this._formControl.value ?? DEFAULT_TEMP));
    }

    protected readonly MAX_ALLOWED_TEMP = MAX_ALLOWED_TEMP;
    protected readonly MIN_ALLOWED_TEMP = MIN_ALLOWED_TEMP;


}
