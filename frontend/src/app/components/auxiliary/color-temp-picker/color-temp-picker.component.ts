/**
 *  This module contains the {@link ColorTempPickerComponent|`ColorTempPickerComponent`} and related classes.
 *
 *  @module
 */
import {AfterViewInit, Component, ElementRef, forwardRef, Input, ViewChild} from '@angular/core';
import {ControlValueAccessor, FormControl, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ColorSpace} from '@common/utils/color-convert';
import {kelvinToXY} from '@common/utils/color-convert-table';
import {DEFAULT_TEMP, MAX_ALLOWED_TEMP, MIN_ALLOWED_TEMP} from '@common/utils/constants';

// noinspection ES6UnusedImports
import type {Datum, DatumType} from '@common/mixing/mix/datum';

/**
 * A component that displays a picker to select a value for a {@link Datum|`Datum`} of type
 * {@link DatumType.COLOR_TEMP|`COLOR_TEMP`}.
 *
 * The component offers a graphical colored slider and input field for selecting a color temperature.
 *
 * The color temperature is shown and edited in Kelvin.
 *
 * @component
 * @componentSelector `<house-mix-color-temp-picker>`
 */
@Component({
               selector:    'house-mix-color-temp-picker',
               imports:     [ReactiveFormsModule, MatFormFieldModule, MatInputModule, FormsModule],
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

    /**
     * The form control handling the result color temperature value.
     *
     * @input
     * @group Component inputs
     */
    @Input()
    public set formControl(formControl: FormControl<number | null>) {
        this._formControl = formControl;
        if (formControl.value == null) {
            formControl.setValue(DEFAULT_TEMP);
        }
    }

    /** The internal property holding the form control handling the result color temperature value. */
    protected _formControl: FormControl<number | null> = new FormControl<number | null>(DEFAULT_TEMP);

    /**
     * The {@link ElementRef|`ElementRef`} to the {@link HTMLCanvasElement|canvas} rendering the color temperature choice area.
     *
     * @viewChild `'canvas'`
     */
    @ViewChild('canvas')
    private canvas!: ElementRef<HTMLCanvasElement>;
    /** The {@link CanvasRenderingContext2D|`CanvasRenderingContext2D`} relative to the {@link ColorTempPickerComponent#canvas|`canvas`}. */
    private ctx!: CanvasRenderingContext2D;
    /** The {@link ImageData|`ImageData`} relative to the {@link ColorTempPickerComponent#canvas|`canvas`}. */
    private imageData!: ImageData;
    /** The width of the {@link ColorTempPickerComponent#canvas|`canvas`}. */
    private ctxWidth!: number;
    /** The height of the {@link ColorTempPickerComponent#canvas|`canvas`}. */
    private ctxHeight!: number;

    /**
     * Whether the component is disabled or can be modified by the user.
     */
    protected disabled: boolean = false;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     */
    constructor() {
        this._formControl.valueChanges.subscribe((value) => {
            if (this.onChange != null && value != null) {
                this.onChange(value);
            }
            if (this.onTouched != null) {
                this.onTouched();
            }
        });
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
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

    /**
     * Request a repaint for the {@link ColorTempPickerComponent#canvas|`canvas`}.
     */
    public repaint(): void {
        for (let x = 0; x < this.ctxWidth; x++) {
            const mired   = 1000000 / MIN_ALLOWED_TEMP - (x / this.ctxWidth) * (1000000 / MIN_ALLOWED_TEMP - 1000000 / MAX_ALLOWED_TEMP);
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

    /**
     * The current position of the slider, in Mired.
     */
    protected get currentSliderPos(): number {
        const temp  = this.safeValue;
        const mired = 1000000 / temp;
        return (1000000 / MIN_ALLOWED_TEMP - mired) / (1000000 / MIN_ALLOWED_TEMP - 1000000 / MAX_ALLOWED_TEMP);
    }


    /** `'HORZ'` if the slider is currently being dragged. `null` if no dragging is currently being performed. */
    protected dragging: null | 'HORZ'        = null;
    /** The bounds of the canvas while it's being dragged. `null` if no dragging is currently being performed. */
    protected draggingBounds: DOMRect | null = null;

    /**
     * Mouse down event for the {@link ColorTempPickerComponent#canvas|`canvas`}.
     *
     * @param {MouseEvent} event - The DOM event.
     * @protected
     */
    protected mouseDown(event: MouseEvent): void {
        if (this.dragging == null && event.button == 0) {
            this.dragging       = 'HORZ';
            this.draggingBounds = (event.target as Element | null)?.getBoundingClientRect() ?? null;
            this.mouseMove(event);
        }
    }

    /**
     * Mouse move event for the {@link ColorTempPickerComponent#canvas|`canvas`}.
     *
     * @param {MouseEvent} event - The DOM event.
     * @protected
     */
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

    /**
     * Mouse up event for the {@link ColorTempPickerComponent#canvas|`canvas`}.
     *
     * @param {MouseEvent} event - The DOM event.
     * @protected
     */
    protected mouseUp(event: MouseEvent): void {
        if (this.dragging == 'HORZ') {
            this.mouseMove(event);
            this.dragging = null;
        }
    }

    /**
     * Key up event for the {@link ColorTempPickerComponent#canvas|`canvas`}.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    protected key(event: KeyboardEvent): void {
        let x = ((this._formControl.value ?? DEFAULT_TEMP) - MIN_ALLOWED_TEMP) / (MAX_ALLOWED_TEMP - MIN_ALLOWED_TEMP);
        if (event.key == 'ArrowRight') {
            x += ((event.shiftKey ? 2 : event.altKey ? 0.5 : 1) * 10) / 360;
            if (x > 1) {
                x = 1;
            }
        } else if (event.key == 'ArrowLeft') {
            x -= ((event.shiftKey ? 2 : event.altKey ? 0.5 : 1) * 10) / 360;
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

    /**
     * Mouse move event for the scrim shown while dragging to extend the dragging to the whole window.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected scrimMouseMove(event: MouseEvent): void {
        if (this.dragging == 'HORZ') {
            this.mouseMove(event);
        }
    }

    /**
     * Mouse up event for the scrim shown while dragging to extend the dragging to the whole window.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected scrimMouseUp(event: MouseEvent): void {
        if (this.dragging == 'HORZ') {
            this.mouseUp(event);
        }
    }

    /**
     * The current color temperature, in CSS format to be shown in the preview.
     */
    protected get styleColor(): string {
        const temp    = this.safeValue;
        const colorXY = kelvinToXY(temp);
        const color   = ColorSpace.sRGB.colorFromXYY(colorXY.x, colorXY.y, 0.75, false);
        return color.toCSS();
    }

    /**
     * The selected color temperature, in Kelvin, clamped between the allowable bounds,
     * or the default value if no color temperature is selected.
     */
    protected get safeValue(): number {
        return Math.min(MAX_ALLOWED_TEMP, Math.max(MIN_ALLOWED_TEMP, this._formControl.value ?? DEFAULT_TEMP));
    }

    // ControlValueAccessor implementation


    /**
     * Implementation of {@link ControlValueAccessor#writeValue| `ControlValueAccessor.writeValue()`}.
     *
     * @param {number} temp - The value to write.
     */
    public writeValue(temp: number): void {
        if (this._formControl.value != temp) {
            this._formControl.setValue(temp, {emitEvent: false});
        }
    }

    /**
     * Change listener for {@link ColorTempPickerComponent#registerOnChange| `registerOnChange()`}.
     */
    protected onChange: ((value: number) => void) | null = null;

    /**
     * Implementation of {@link ControlValueAccessor#registerOnChange| `ControlValueAccessor.registerOnChange()`}.
     *
     * @param {(value: number) => void} fn - The listener.
     */
    public registerOnChange(fn: (value: number) => void): void {
        this.onChange = fn;
    }

    /**
     * Touched listener for {@link ColorTempPickerComponent#registerOnTouched| `registerOnTouched()`}.
     */
    protected onTouched: (() => void) | null = null;

    /**
     * Implementation of {@link ControlValueAccessor#registerOnTouched| `ControlValueAccessor.registerOnTouched()`}.
     *
     * @param {() => void} fn - The listener.
     */
    public registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    /**
     * Implementation of {@link ControlValueAccessor#setDisabledState| `ControlValueAccessor.setDisabledState()`}.
     *
     * @param {boolean} isDisabled - The value.
     */
    public setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
        if (isDisabled) {
            this._formControl.disable();
        } else {
            this._formControl.enable();
        }
    }

    /** @ignore */
    protected readonly MAX_ALLOWED_TEMP = MAX_ALLOWED_TEMP;
    /** @ignore */
    protected readonly MIN_ALLOWED_TEMP = MIN_ALLOWED_TEMP;
}
