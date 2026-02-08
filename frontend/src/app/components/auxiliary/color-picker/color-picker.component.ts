import {AfterViewInit, Component, ElementRef, forwardRef, Input, ViewChild} from '@angular/core';
import {DatumTypeColor, DatumTypeColorBase} from '@common/mixing/mix/datum';
import {Color, ColorSpace} from '@common/utils/color-convert';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';
import {ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
import {Point} from '@angular/cdk/drag-drop';
import {MatChipListbox, MatChipOption} from '@angular/material/chips';

@Component({
               selector:    'house-mix-color-picker',
               imports: [
                   MatFormField,
                   MatLabel,
                   MatOption,
                   MatSelect,
                   ReactiveFormsModule,
                   MatChipListbox,
                   MatChipOption,
                   MatInput,
                   MatError
               ],
               providers: [
                   {
                       provide: NG_VALUE_ACCESSOR,
                       useExisting: forwardRef(() => ColorPickerComponent),
                       multi: true
                   }
               ],
               templateUrl: './color-picker.component.html',
               styleUrl:    './color-picker.component.scss'
           })
export class ColorPickerComponent implements AfterViewInit, ControlValueAccessor {

    @Input()
    public set formControl(formControl: FormControl<DatumTypeColor | null>) {
        this._formControl = formControl;
        if (formControl.value == null) {
            this._base = DatumTypeColorBase.RGB;
            this.h     = 0;
            this.s     = 0;
            this.v     = 1;
            this.x     = 0;
            this.y     = 0;
            formControl.setValue(new DatumTypeColor(DatumTypeColorBase.RGB, 255, 255, 255));
        } else {
            this._base = formControl.value.base;
            if (this._base == DatumTypeColorBase.XY) {
                this.x = formControl.value.x ?? 0.33;
                this.y = formControl.value.y ?? 0.33;
                this.h = 0;
                this.s = 0;
                this.v = 1;
            } else {
                const convertColor =
                          new Color(
                              (formControl.value.r ?? 255) / 255,
                              (formControl.value.g ?? 255) / 255,
                              (formControl.value.b ?? 255) / 255, 1
                          )
                              .toHSV();
                this.h             = convertColor.h;
                this.s             = convertColor.s;
                this.v             = convertColor.v;
                this.x             = 0;
                this.y             = 0;
            }
        }
        this.colorSpaceFormControl.setValue(this._base);
        if (this._base == DatumTypeColorBase.XY) {
            this.numberInputsFormControl.setValue(NumberInput.XY);
        }
        this.updateInputs();
    }

    protected _formControl: FormControl<DatumTypeColor | null> = new FormControl<DatumTypeColor>(new DatumTypeColor(DatumTypeColorBase.RGB, 255, 255, 255));

    @ViewChild('squareCanvas')
    private squareCanvas!: ElementRef<HTMLCanvasElement>;
    private squareCtx!: CanvasRenderingContext2D;
    private squareImageData!: ImageData;
    private squareCtxWidth!: number;
    private squareCtxHeight!: number;

    @ViewChild('verticalCanvas')
    private verticalCanvas!: ElementRef<HTMLCanvasElement>;
    private verticalCtx!: CanvasRenderingContext2D;
    private verticalImageData!: ImageData;
    private verticalCtxWidth!: number;
    private verticalCtxHeight!: number;

    protected h: number                 = 0;
    private s: number                   = 0;
    private v: number                   = 1;
    private x: number                   = 0;
    private y: number                   = 0;
    protected _base: DatumTypeColorBase = DatumTypeColorBase.RGB;

    protected colorSpaceFormControl: FormControl<DatumTypeColorBase | null> = new FormControl<DatumTypeColorBase | null>(DatumTypeColorBase.RGB);

    protected numberInputsFormControl: FormControl<NumberInput | null> = new FormControl<NumberInput | null>(null);
    protected firstInputFormControl: FormControl<number | null>        = new FormControl<number | null>(null);
    protected secondInputFormControl: FormControl<number | null>       = new FormControl<number | null>(null);
    protected thirdInputFormControl: FormControl<number | null>        = new FormControl<number | null>(null);
    protected stringInputFormControl: FormControl<string | null>       = new FormControl<string | null>(null, Validators.pattern(/^#?[0-9a-fA-F]{6}$/));
    protected inputFormGroup: FormGroup<{ first: FormControl<number | null>, second: FormControl<number | null>, third: FormControl<number | null>, string: FormControl<string | null> }>
                                                                       = new FormGroup<{
        first: FormControl<number | null>,
        second: FormControl<number | null>,
        third: FormControl<number | null>,
        string: FormControl<string | null>
    }>
    ({
         first:  this.firstInputFormControl,
         second: this.secondInputFormControl,
         third:  this.thirdInputFormControl,
         string: this.stringInputFormControl
     });

    protected lastRGBInput: NumberInput | null = null;

    constructor() {
        this.colorSpaceFormControl.valueChanges.subscribe(value => {
            if (value != null) {
                this.base = value;
            }
        });
        this.numberInputsFormControl.valueChanges.subscribe(value => {
            if (value != null && value !== NumberInput.XY) {
                this.lastRGBInput = value;
            }
            this.updateInputs();
        });
        this._formControl.valueChanges.subscribe(value => {
            if (this.onChange != null && value != null) {
                this.onChange(value);
            }
            if (this.onTouched != null) {
                this.onTouched();
            }
        })
        this.inputFormGroup.valueChanges.subscribe(value => {
            if (this.inputFormGroup.invalid) {
                return;
            }
            switch (this.numberInputsFormControl.value) {
                case null: {
                    break;
                }
                case NumberInput.RGB: {
                    const conversion = new Color((value.first ?? 0) / 255, (value.second ?? 0) / 255, (value.third ?? 0) / 255, 1).toHSV();
                    this.h           = conversion.h;
                    this.s           = conversion.s;
                    this.v           = conversion.v;
                    this._formControl.setValue(
                        new DatumTypeColor(
                            DatumTypeColorBase.RGB,
                            Math.round(value.first ?? 0), Math.round(value.second ?? 0), Math.round(value.third ?? 0)
                        )
                    );
                    this.repaint();
                    break;
                }
                case NumberInput.HSB: {
                    const color = Color.hsv((value.first ?? 0) / 360, (value.second ?? 0) / 100, (value.third ?? 0) / 100);
                    this.h      = (value.first ?? 0) / 360;
                    this.s      = (value.second ?? 0) / 100;
                    this.v      = (value.third ?? 0) / 100;
                    this._formControl.setValue(
                        new DatumTypeColor(
                            DatumTypeColorBase.RGB,
                            Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)
                        )
                    );
                    this.repaint();
                    break;
                }
                case NumberInput.HEX: {
                    if (value.string?.startsWith('#') === true) {
                        this.stringInputFormControl.setValue(value.string.substring(1));
                    } else {
                        if (value.string?.length == 6) {
                            const color = Color.parse('#' + value.string);
                            if (color) {
                                const conversion = color.toHSV();
                                this.h           = conversion.h;
                                this.s           = conversion.s;
                                this.v           = conversion.v;
                                this._formControl.setValue(
                                    new DatumTypeColor(
                                        DatumTypeColorBase.RGB,
                                        Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)
                                    )
                                );
                                this.repaint();
                            }
                        }
                    }
                    break;
                }
                case NumberInput.HSL: {
                    const color = Color.hsl((value.first ?? 0) / 360, (value.second ?? 0) / 100, (value.third ?? 0) / 100);
                    const conversion = color.toHSV();
                    this.h      = (value.first ?? 0) / 360;
                    this.s      = conversion.s;
                    this.v      = conversion.v;
                    this._formControl.setValue(
                        new DatumTypeColor(
                            DatumTypeColorBase.RGB,
                            Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)
                        )
                    );
                    this.repaint();
                    break;
                }
                case NumberInput.XY: {
                    this.x = value.first ?? 0;
                    this.y = value.second ?? 0;
                    this._formControl.setValue(
                        new DatumTypeColor(
                            DatumTypeColorBase.XY,
                            this.x, this.y
                        )
                    )
                    break;
                }
            }
        });
    }

    public writeValue(color: DatumTypeColor): void {
        if (this._formControl.value != color) {
            this._formControl.setValue(color, {emitEvent: false});
        }
    }

    protected onChange: ((value: DatumTypeColor) => void) | null = null;

    public registerOnChange(fn: (value: DatumTypeColor) => void): void {
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
            this.colorSpaceFormControl.disable();
            this.numberInputsFormControl.disable();
            this.firstInputFormControl.disable();
            this.secondInputFormControl.disable();
            this.thirdInputFormControl.disable();
            this.stringInputFormControl.disable();
        } else {
            this.colorSpaceFormControl.enable();
            this.numberInputsFormControl.enable();
            this.firstInputFormControl.enable();
            this.secondInputFormControl.enable();
            this.thirdInputFormControl.enable();
            this.stringInputFormControl.enable();
        }
    }

    public ngAfterViewInit(): void {
        let ctx = this.squareCanvas.nativeElement.getContext('2d');
        if (ctx) {
            this.squareCtx       = ctx;
            this.squareCtxWidth  = ctx.canvas.width = this.squareCanvas.nativeElement.offsetWidth * window.devicePixelRatio;
            this.squareCtxHeight = ctx.canvas.height = this.squareCanvas.nativeElement.offsetHeight * window.devicePixelRatio;
            this.squareImageData = ctx.createImageData(this.squareCtxWidth, this.squareCtxHeight);
        }
        ctx = this.verticalCanvas.nativeElement.getContext('2d');
        if (ctx) {
            this.verticalCtx       = ctx;
            this.verticalCtxWidth  = ctx.canvas.width = this.verticalCanvas.nativeElement.offsetWidth * window.devicePixelRatio;
            this.verticalCtxHeight = ctx.canvas.height = this.verticalCanvas.nativeElement.offsetHeight * window.devicePixelRatio;
            this.verticalImageData = ctx.createImageData(this.verticalCtxWidth, this.verticalCtxHeight);
        }
        this.repaint();
        this.updateInputs();
    }

    public set base(base: DatumTypeColorBase) {
        if (this._base != base) {
            switch (base) {
                case DatumTypeColorBase.XY: {
                    const conversion = ColorSpace.sRGB.xyYFromColor(Color.hsv(this.h, this.s, this.v));
                    this.x           = conversion.x;
                    this.y           = conversion.y;
                    this._formControl.setValue(
                        new DatumTypeColor(
                            DatumTypeColorBase.XY,
                            this.x, this.y
                        )
                    );
                    break;
                }
                case DatumTypeColorBase.RGB: {
                    const color      = ColorSpace.sRGB.colorFromXY(this.x, this.y);
                    const conversion = color.toHSV();
                    this.h           = conversion.h;
                    this.s           = conversion.s;
                    this.v           = conversion.v;
                    this._formControl.setValue(
                        new DatumTypeColor(
                            DatumTypeColorBase.RGB,
                            Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)
                        )
                    );
                    break;
                }
            }
            if (base == DatumTypeColorBase.XY) {
                this.numberInputsFormControl.setValue(NumberInput.XY);
            } else {
                this.numberInputsFormControl.setValue(this.lastRGBInput);
            }
        }
        this._base = base;
        this.updateInputs();
        if (this.squareCtx as unknown != null) {
            this.repaint();
        }
    }

    public repaint(): void {
        if (this._base == DatumTypeColorBase.XY) {
            for (let x = 0; x < this.squareCtxWidth; x++) {
                const colorX = x / this.squareCtxWidth;
                for (let y = 0; y < this.squareCtxHeight; y++) {
                    const color                                                      = ColorSpace.sRGB.colorFromXY(colorX, 1 - y / this.squareCtxHeight, false);
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4]     = color.r * 255;
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4 + 1] = color.g * 255;
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4 + 2] = color.b * 255;
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4 + 3] = 255;
                }
            }
            this.squareCtx.putImageData(this.squareImageData, 0, 0);
        } else {
            for (let x = 0; x < this.squareCtxWidth; x++) {
                const saturation = x / this.squareCtxWidth;
                for (let y = 0; y < this.squareCtxHeight; y++) {
                    const color                                                      = Color.hsv(this.h, saturation, y / this.squareCtxHeight);
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4]     = color.r * 255;
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4 + 1] = color.g * 255;
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4 + 2] = color.b * 255;
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4 + 3] = 255;
                }
            }
            this.squareCtx.putImageData(this.squareImageData, 0, 0);
            for (let x = 0; x < this.verticalCtxWidth; x++) {
                for (let y = 0; y < this.verticalCtxHeight; y++) {
                    const color                                                          = Color.hsv(y / this.verticalCtxHeight, 1, 1);
                    this.verticalImageData.data[(x + y * this.verticalCtxWidth) * 4]     = color.r * 255;
                    this.verticalImageData.data[(x + y * this.verticalCtxWidth) * 4 + 1] = color.g * 255;
                    this.verticalImageData.data[(x + y * this.verticalCtxWidth) * 4 + 2] = color.b * 255;
                    this.verticalImageData.data[(x + y * this.verticalCtxWidth) * 4 + 3] = 255;
                }
            }
            this.verticalCtx.putImageData(this.verticalImageData, 0, 0);
        }
    }

    public updateInputs(): void {
        const numberInputs = this.numberInputsFormControl.value;
        if (numberInputs != null) {
            let color;
            if (this._base == DatumTypeColorBase.RGB) {
                color = Color.hsv(this.h, this.s, this.v);
            } else {
                color = ColorSpace.sRGB.colorFromXY(this.x, this.y);
            }
            switch (numberInputs) {
                case NumberInput.RGB: {
                    this.firstInputFormControl.setValue(Math.round(color.r * 255), {emitEvent: false});
                    this.secondInputFormControl.setValue(Math.round(color.g * 255), {emitEvent: false});
                    this.thirdInputFormControl.setValue(Math.round(color.b * 255), {emitEvent: false});
                    break;
                }
                case NumberInput.HSB: {
                    const conversion = color.toHSV();
                    this.firstInputFormControl.setValue(Math.round(this.h * 360), {emitEvent: false});
                    this.secondInputFormControl.setValue(Math.round(conversion.s * 100), {emitEvent: false});
                    this.thirdInputFormControl.setValue(Math.round(conversion.v * 100), {emitEvent: false});
                    break;
                }
                case NumberInput.HEX: {
                    this.stringInputFormControl.setValue(color.toHex().toUpperCase().substring(1), {emitEvent: false});
                    break;
                }
                case NumberInput.HSL: {
                    const conversion = color.toHSL();
                    this.firstInputFormControl.setValue(Math.round(this.h * 360), {emitEvent: false});
                    this.secondInputFormControl.setValue(Math.round(conversion.s * 100), {emitEvent: false});
                    this.thirdInputFormControl.setValue(Math.round(conversion.l * 100), {emitEvent: false});
                    break;
                }
                case NumberInput.XY: {
                    this.firstInputFormControl.setValue(this.x - (this.x % 0.001), {emitEvent: false});
                    this.secondInputFormControl.setValue(this.y - (this.y % 0.001), {emitEvent: false});
                    break;
                }
            }
        }
    }

    protected get selectedColor(): Color {
        const value = this._formControl.value;
        switch (value?.base) {
            case DatumTypeColorBase.XY: {
                return ColorSpace.sRGB.colorFromXY(value.x ?? 0.33, value.y ?? 0.33);
            }
            case DatumTypeColorBase.RGB: {
                return new Color((value.r ?? 255) / 255, (value.g ?? 255) / 255, (value.b ?? 255) / 255, 1);
            }
            case undefined: {
                return Color.white;
            }
        }
    }

    protected get squareSelectorPosition(): Point {
        if (this._formControl.value?.base == DatumTypeColorBase.XY) {
            return ({x: this.x, y: 1 - this.y});
        } else {
            return ({x: this.s, y: this.v});
        }
    }

    public get firstInputLabel(): string | null {
        switch (this._formControl.value?.base) {
            case DatumTypeColorBase.XY: {
                return 'X';
            }
            case DatumTypeColorBase.RGB: {
                switch (this.numberInputsFormControl.value) {
                    case NumberInput.RGB: {
                        return 'Red';
                    }
                    case NumberInput.HSB: {
                        return 'Hue';
                    }
                    case NumberInput.HSL: {
                        return 'Hue';
                    }
                    case null:
                    case NumberInput.HEX:
                    case NumberInput.XY: {
                        return null;
                    }
                }
                break;
            }
            case undefined: {
                return null;
            }
        }
    }

    public get secondInputLabel(): string | null {
        switch (this._formControl.value?.base) {
            case DatumTypeColorBase.XY: {
                return 'Y';
            }
            case DatumTypeColorBase.RGB: {
                switch (this.numberInputsFormControl.value) {
                    case NumberInput.RGB: {
                        return 'Green';
                    }
                    case NumberInput.HSL:
                    case NumberInput.HSB: {
                        return 'Sat';
                    }
                    case NumberInput.HEX:
                    case NumberInput.XY:
                    case null: {
                        return null;
                    }
                }
                break;
            }
            case undefined: {
                return null;
            }
        }
    }

    public get thirdInputLabel(): string | null {
        switch (this._formControl.value?.base) {
            case DatumTypeColorBase.XY: {
                return null;
            }
            case DatumTypeColorBase.RGB: {
                switch (this.numberInputsFormControl.value) {
                    case NumberInput.RGB: {
                        return 'Blue';
                    }
                    case NumberInput.HSL: {
                        return 'Light';
                    }
                    case NumberInput.HSB: {
                        return 'Val/Bright';
                    }
                    case NumberInput.HEX:
                    case NumberInput.XY:
                    case null: {
                        return null;
                    }
                }
                break;
            }
            case undefined: {
                return null;
            }
        }
    }

    public get stringInputLabel(): string | null {
        if (this._formControl.value?.base == DatumTypeColorBase.RGB && this.numberInputsFormControl.value == NumberInput.HEX) {
            return 'Hex';
        } else {
            return null;
        }
    }

    public get firstInputMax(): number {
        switch (this._formControl.value?.base) {
            case DatumTypeColorBase.XY: {
                return 1;
            }
            case DatumTypeColorBase.RGB: {
                switch (this.numberInputsFormControl.value) {
                    case NumberInput.RGB:
                        return 255;
                    case NumberInput.HSB:
                    case NumberInput.HSL:
                        return 360;
                    case null:
                    case NumberInput.HEX:
                    case NumberInput.XY:
                        return 0;
                }
                break;
            }
            case undefined: {
                return 0;
            }
        }
    }

    public get secondInputMax(): number {
        switch (this._formControl.value?.base) {
            case DatumTypeColorBase.XY: {
                return 1;
            }
            case DatumTypeColorBase.RGB: {
                switch (this.numberInputsFormControl.value) {
                    case NumberInput.RGB:
                        return 255;
                    case NumberInput.HSB:
                    case NumberInput.HSL:
                        return 100;
                    case null:
                    case NumberInput.HEX:
                    case NumberInput.XY:
                        return 0;
                }
                break;
            }
            case undefined: {
                return 0;
            }
        }
    }

    public get thirdInputMax(): number {
        switch (this._formControl.value?.base) {
            case DatumTypeColorBase.XY: {
                return 0;
            }
            case DatumTypeColorBase.RGB: {
                switch (this.numberInputsFormControl.value) {
                    case NumberInput.RGB:
                        return 255;
                    case NumberInput.HSB:
                    case NumberInput.HSL:
                        return 100;
                    case null:
                    case NumberInput.HEX:
                    case NumberInput.XY:
                        return 0;
                }
                break;
            }
            case undefined: {
                return 0;
            }
        }
    }

    protected dragging: null | 'SQUARE' | 'VERT' = null;
    protected draggingBounds: DOMRect | null     = null;

    protected squareMouseDown(event: MouseEvent): void {
        if (this.dragging == null && event.button == 0) {
            this.dragging       = 'SQUARE';
            this.draggingBounds = (event.target as Element | null)?.getBoundingClientRect() ?? null;
            this.squareMouseMove(event);
        }
    }

    protected squareMouseMove(event: MouseEvent): void {
        if (this.dragging == 'SQUARE') {
            const rect = this.draggingBounds;
            if (rect === null) {
                return;
            }
            const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
            const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
            if (this._base == DatumTypeColorBase.XY) {
                this._formControl.setValue(
                    new DatumTypeColor(
                        DatumTypeColorBase.XY,
                        x, 1 - y
                    )
                );
                this.x = x;
                this.y = 1 - y;
            } else {
                this.s      = x;
                this.v      = y;
                const color = Color.hsv(this.h, this.s, this.v);
                this._formControl.setValue(
                    new DatumTypeColor(
                        DatumTypeColorBase.RGB,
                        Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)
                    )
                );
            }
            this.updateInputs();
        }
    }

    protected squareMouseUp(event: MouseEvent): void {
        if (this.dragging == 'SQUARE') {
            this.squareMouseMove(event);
            this.dragging = null;
        }
    }


    protected verticalMouseDown(event: MouseEvent): void {
        if (this.dragging == null && event.button == 0) {
            this.dragging       = 'VERT';
            this.draggingBounds = (event.target as Element | null)?.getBoundingClientRect() ?? null;
            this.verticalMouseMove(event);
        }
    }

    protected verticalMouseMove(event: MouseEvent): void {
        if (this.dragging == 'VERT') {
            const rect = this.draggingBounds;
            if (rect === null) {
                return;
            }
            const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
            if (this._base == DatumTypeColorBase.RGB) {
                this.h      = y;
                const color = Color.hsv(this.h, this.s, this.v);
                this._formControl.setValue(
                    new DatumTypeColor(
                        DatumTypeColorBase.RGB,
                        Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)
                    )
                );
                this.repaint();
                this.updateInputs();
            }
        }
    }

    protected verticalMouseUp(event: MouseEvent): void {
        if (this.dragging == 'VERT') {
            this.verticalMouseMove(event);
            this.dragging = null;
        }
    }

    protected scrimMouseMove(event: MouseEvent): void {
        if (this.dragging == 'SQUARE') {
            this.squareMouseMove(event);
        } else if (this.dragging == 'VERT') {
            this.verticalMouseMove(event);
        }
    }

    protected scrimMouseUp(event: MouseEvent): void {
        if (this.dragging == 'SQUARE') {
            this.squareMouseUp(event);
        } else if (this.dragging == 'VERT') {
            this.verticalMouseUp(event);
        }
    }

    protected readonly DatumTypeColorBase = DatumTypeColorBase;
    protected readonly Color              = Color;
    protected readonly NumberInput        = NumberInput;
}


export enum NumberInput {
    RGB = 'RGB',
    HSB = 'HSB',
    HEX = 'HEX',
    HSL = 'HSL',
    XY  = 'XY'
}
