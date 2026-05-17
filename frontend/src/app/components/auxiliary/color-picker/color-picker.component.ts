/**
 *  This module contains the {@link ColorPickerComponent|`ColorPickerComponent`} and related classes.
 *
 *  @module
 */
import {AfterViewInit, Component, ElementRef, forwardRef, Input, ViewChild} from '@angular/core';
import {DatumTypeColor, DatumTypeColorBase} from '@common/mixing/mix/datum';
import {Color, ColorSpace} from '@common/utils/color-convert';
import {MatError, MatFormField, MatInput, MatInputModule, MatLabel} from '@angular/material/input';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';
import {ControlValueAccessor, FormControl, FormGroup, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
import {Point} from '@angular/cdk/drag-drop';
import {MatChipListbox, MatChipOption} from '@angular/material/chips';
import {MatFormFieldModule} from '@angular/material/form-field';

/**
 * A component that displays a color picker to select a value for {@link DatumTypeColor|`DatumTypeColor`}.
 *
 * The component offers the choice of {@link DatumTypeColorBase.RGB|`RGB`} or {@link DatumTypeColorBase.XY|`XY`}
 * color base, with a graphical 2D (+additional slider for {@link DatumTypeColorBase.RGB|`RGB`}) clickable area
 * and input fields for {@link NumberInput.RGB|`RGB`}, {@link NumberInput.HSB|`HSB`},  {@link NumberInput.HSL|`HSL`},
 * {@link NumberInput.HEX|`Hex`} and {@link NumberInput.XY|`XY`}.
 *
 * @component
 * @componentSelector `<house-mix-color-picker>`
 */
@Component({
    selector: 'house-mix-color-picker',
    imports: [MatFormField, MatLabel, MatOption, MatSelect, ReactiveFormsModule, MatChipListbox, MatChipOption, MatInput, MatError, MatFormFieldModule, MatInputModule, FormsModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ColorPickerComponent),
            multi: true,
        },
    ],
    templateUrl: './color-picker.component.html',
    styleUrl: './color-picker.component.scss',
})
export class ColorPickerComponent implements AfterViewInit, ControlValueAccessor {

    /**
     * The form control handling the result color value.
     *
     * @input
     * @group Component inputs
     */
    @Input()
    public set formControl(formControl: FormControl<DatumTypeColor | null>) {
        this._formControl = formControl;
        if (formControl.value == null) {
            this._base = DatumTypeColorBase.RGB;
            this.h = 0;
            this.s = 0;
            this.v = 1;
            this.x = 0;
            this.y = 0;
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
                const convertColor = new Color((formControl.value.r ?? 255) / 255, (formControl.value.g ?? 255) / 255, (formControl.value.b ?? 255) / 255, 1).toHSV();
                this.h = convertColor.h;
                this.s = convertColor.s;
                this.v = convertColor.v;
                this.x = 0;
                this.y = 0;
            }
        }
        this.colorSpaceFormControl.setValue(this._base);
        if (this._base == DatumTypeColorBase.XY) {
            this.numberInputsFormControl.setValue(NumberInput.XY);
        }
        this.updateInputs();
    }

    /** The internal property holding the form control handling the result color value. */
    protected _formControl: FormControl<DatumTypeColor | null> = new FormControl<DatumTypeColor>(new DatumTypeColor(DatumTypeColorBase.RGB, 255, 255, 255));

    /**
     * The {@link ElementRef|`ElementRef`} to the {@link HTMLCanvasElement|canvas} rendering the main 2D color choice area.
     *
     * @viewChild `'squareCanvas'`
     */
    @ViewChild('squareCanvas')
    private squareCanvas!: ElementRef<HTMLCanvasElement>;
    /** The {@link CanvasRenderingContext2D|`CanvasRenderingContext2D`} relative to the {@link ColorPickerComponent#squareCanvas|`squareCanvas`}. */
    private squareCtx!: CanvasRenderingContext2D;
    /** The {@link ImageData|`ImageData`} relative to the {@link ColorPickerComponent#squareCanvas|`squareCanvas`}. */
    private squareImageData!: ImageData;
    /** The width of the {@link ColorPickerComponent#squareCanvas|`squareCanvas`}. */
    private squareCtxWidth!: number;
    /** The height of the {@link ColorPickerComponent#squareCanvas|`squareCanvas`}. */
    private squareCtxHeight!: number;

    /**
     * The {@link ElementRef|`ElementRef`} to the {@link HTMLCanvasElement|canvas} rendering the additional 1D strip color choice area.
     *
     * @viewChild `'verticalCanvas'`
     */
    @ViewChild('verticalCanvas')
    private verticalCanvas!: ElementRef<HTMLCanvasElement>;
    /** The {@link CanvasRenderingContext2D|`CanvasRenderingContext2D`} relative to the {@link ColorPickerComponent#verticalCanvas|`verticalCanvas`}. */
    private verticalCtx!: CanvasRenderingContext2D;
    /** The {@link ImageData|`ImageData`} relative to the {@link ColorPickerComponent#verticalCanvas|`verticalCanvas`}. */
    private verticalImageData!: ImageData;
    /** The width of the {@link ColorPickerComponent#verticalCanvas|`verticalCanvas`}. */
    private verticalCtxWidth!: number;
    /** The height of the {@link ColorPickerComponent#verticalCanvas|`verticalCanvas`}. */
    private verticalCtxHeight!: number;

    /** The hue of the selected color, when using the {@link DatumTypeColorBase.RGB|`RGB`} color base. */
    protected h: number = 0;
    /** The saturation of the selected color, when using the {@link DatumTypeColorBase.RGB|`RGB`} color base. */
    private s: number = 0;
    /** The value of the selected color, when using the {@link DatumTypeColorBase.RGB|`RGB`} color base. */
    private v: number = 1;
    /** The x coordinate of the selected color, when using the {@link DatumTypeColorBase.XY|`XY`} color base. */
    private x: number = 0;
    /** The y coordinate of the selected color, when using the {@link DatumTypeColorBase.XY|`XY`} color base. */
    private y: number = 0;
    /** The color base currently being selected in the component for editing. */
    protected _base: DatumTypeColorBase = DatumTypeColorBase.RGB;

    /** The form control handling the color base selector. */
    protected colorSpaceFormControl: FormControl<DatumTypeColorBase | null> = new FormControl<DatumTypeColorBase | null>(DatumTypeColorBase.RGB);

    /** The form control handling the input number set selector. */
    protected numberInputsFormControl: FormControl<NumberInput | null> = new FormControl<NumberInput | null>(null);
    /** The form  control handling the first number input value (R, H, X). */
    protected firstInputFormControl: FormControl<number | null> = new FormControl<number | null>(null);
    /** The form control handling the second number input value (G, S, Y). */
    protected secondInputFormControl: FormControl<number | null> = new FormControl<number | null>(null);
    /** The form control handling the third number input value (B[lue], B[rightness], V). */
    protected thirdInputFormControl: FormControl<number | null> = new FormControl<number | null>(null);
    /** The form control handling the string input value (Hex). */
    protected stringInputFormControl: FormControl<string | null> = new FormControl<string | null>(null, Validators.pattern(/^#?[0-9a-fA-F]{6}$/));
    /** The form group handling all the inputs. */
    protected inputFormGroup: FormGroup<{ first: FormControl<number | null>; second: FormControl<number | null>; third: FormControl<number | null>; string: FormControl<string | null> }> =
        new FormGroup<{
            first: FormControl<number | null>;
            second: FormControl<number | null>;
            third: FormControl<number | null>;
            string: FormControl<string | null>;
        }>({
            first: this.firstInputFormControl,
            second: this.secondInputFormControl,
            third: this.thirdInputFormControl,
            string: this.stringInputFormControl,
        });

    /** Temp storage for the last selected input set in {@link DatumTypeColorBase.RGB|`RGB`}, to keep while switching to {@link DatumTypeColorBase.XY|`XY`} in case of a switch back. */
    protected lastRGBInput: NumberInput | null = null;

    /**
     * Whether the component is disabled or can be modified by the user.
     */
    protected disabled: boolean = false;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     */
    constructor() {
        this.colorSpaceFormControl.valueChanges.subscribe((value) => {
            if (value != null) {
                this.base = value;
            }
        });
        this.numberInputsFormControl.valueChanges.subscribe((value) => {
            if (value != null && value !== NumberInput.XY) {
                this.lastRGBInput = value;
            }
            this.updateInputs();
        });
        this._formControl.valueChanges.subscribe((value) => {
            if (this.onChange != null && value != null) {
                this.onChange(value);
            }
            if (this.onTouched != null) {
                this.onTouched();
            }
        });
        this.inputFormGroup.valueChanges.subscribe((value) => {
            if (this.inputFormGroup.invalid) {
                return;
            }
            switch (this.numberInputsFormControl.value) {
                case null: {
                    break;
                }
                case NumberInput.RGB: {
                    const conversion = new Color((value.first ?? 0) / 255, (value.second ?? 0) / 255, (value.third ?? 0) / 255, 1).toHSV();
                    this.h = conversion.h;
                    this.s = conversion.s;
                    this.v = conversion.v;
                    this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.RGB, Math.round(value.first ?? 0), Math.round(value.second ?? 0), Math.round(value.third ?? 0)));
                    this.repaint();
                    break;
                }
                case NumberInput.HSB: {
                    const color = Color.hsv((value.first ?? 0) / 360, (value.second ?? 0) / 100, (value.third ?? 0) / 100);
                    this.h = (value.first ?? 0) / 360;
                    this.s = (value.second ?? 0) / 100;
                    this.v = (value.third ?? 0) / 100;
                    this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.RGB, Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)));
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
                                this.h = conversion.h;
                                this.s = conversion.s;
                                this.v = conversion.v;
                                this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.RGB, Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)));
                                this.repaint();
                            }
                        }
                    }
                    break;
                }
                case NumberInput.HSL: {
                    const color = Color.hsl((value.first ?? 0) / 360, (value.second ?? 0) / 100, (value.third ?? 0) / 100);
                    const conversion = color.toHSV();
                    this.h = (value.first ?? 0) / 360;
                    this.s = conversion.s;
                    this.v = conversion.v;
                    this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.RGB, Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)));
                    this.repaint();
                    break;
                }
                case NumberInput.XY: {
                    this.x = value.first ?? 0;
                    this.y = value.second ?? 0;
                    this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.XY, this.x, this.y));
                    break;
                }
            }
        });
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
    public ngAfterViewInit(): void {
        let ctx = this.squareCanvas.nativeElement.getContext('2d');
        if (ctx) {
            this.squareCtx = ctx;
            this.squareCtxWidth = ctx.canvas.width = this.squareCanvas.nativeElement.offsetWidth * window.devicePixelRatio;
            this.squareCtxHeight = ctx.canvas.height = this.squareCanvas.nativeElement.offsetHeight * window.devicePixelRatio;
            this.squareImageData = ctx.createImageData(this.squareCtxWidth, this.squareCtxHeight);
        }
        ctx = this.verticalCanvas.nativeElement.getContext('2d');
        if (ctx) {
            this.verticalCtx = ctx;
            this.verticalCtxWidth = ctx.canvas.width = this.verticalCanvas.nativeElement.offsetWidth * window.devicePixelRatio;
            this.verticalCtxHeight = ctx.canvas.height = this.verticalCanvas.nativeElement.offsetHeight * window.devicePixelRatio;
            this.verticalImageData = ctx.createImageData(this.verticalCtxWidth, this.verticalCtxHeight);
        }
        this.repaint();
        this.updateInputs();
    }

    /**
     * Changes the {@link ColorPickerComponent#base|`base`} the component is displaying now. If it's different,
     * a conversion (possibly lossy) gets performed.
     */
    public set base(base: DatumTypeColorBase) {
        if (this._base != base) {
            switch (base) {
                case DatumTypeColorBase.XY: {
                    const conversion = ColorSpace.sRGB.xyYFromColor(Color.hsv(this.h, this.s, this.v));
                    this.x = conversion.x;
                    this.y = conversion.y;
                    this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.XY, this.x, this.y));
                    break;
                }
                case DatumTypeColorBase.RGB: {
                    const color = ColorSpace.sRGB.colorFromXY(this.x, this.y);
                    const conversion = color.toHSV();
                    this.h = conversion.h;
                    this.s = conversion.s;
                    this.v = conversion.v;
                    this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.RGB, Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)));
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
        if ((this.squareCtx as unknown) != null) {
            this.repaint();
        }
    }

    /**
     * Request a repaint for both the {@link ColorPickerComponent#squareCanvas|`squareCanvas`}
     * and the {@link ColorPickerComponent#verticalCanvas|`verticalCanvas`}, if visible.
     */
    public repaint(): void {
        if (this._base == DatumTypeColorBase.XY) {
            for (let x = 0; x < this.squareCtxWidth; x++) {
                const colorX = x / this.squareCtxWidth;
                for (let y = 0; y < this.squareCtxHeight; y++) {
                    const color = ColorSpace.sRGB.colorFromXY(colorX, 1 - y / this.squareCtxHeight, false);
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4] = color.r * 255;
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
                    const color = Color.hsv(this.h, saturation, y / this.squareCtxHeight);
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4] = color.r * 255;
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4 + 1] = color.g * 255;
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4 + 2] = color.b * 255;
                    this.squareImageData.data[(x + y * this.squareCtxWidth) * 4 + 3] = 255;
                }
            }
            this.squareCtx.putImageData(this.squareImageData, 0, 0);
            for (let x = 0; x < this.verticalCtxWidth; x++) {
                for (let y = 0; y < this.verticalCtxHeight; y++) {
                    const color = Color.hsv(y / this.verticalCtxHeight, 1, 1);
                    this.verticalImageData.data[(x + y * this.verticalCtxWidth) * 4] = color.r * 255;
                    this.verticalImageData.data[(x + y * this.verticalCtxWidth) * 4 + 1] = color.g * 255;
                    this.verticalImageData.data[(x + y * this.verticalCtxWidth) * 4 + 2] = color.b * 255;
                    this.verticalImageData.data[(x + y * this.verticalCtxWidth) * 4 + 3] = 255;
                }
            }
            this.verticalCtx.putImageData(this.verticalImageData, 0, 0);
        }
    }

    /**
     * Align all the inputs to the current color value, setting them according to the current
     * selected {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
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
                    this.firstInputFormControl.setValue(Math.round(color.r * 255), { emitEvent: false });
                    this.secondInputFormControl.setValue(Math.round(color.g * 255), { emitEvent: false });
                    this.thirdInputFormControl.setValue(Math.round(color.b * 255), { emitEvent: false });
                    break;
                }
                case NumberInput.HSB: {
                    const conversion = color.toHSV();
                    this.firstInputFormControl.setValue(Math.round(this.h * 360), { emitEvent: false });
                    this.secondInputFormControl.setValue(Math.round(conversion.s * 100), { emitEvent: false });
                    this.thirdInputFormControl.setValue(Math.round(conversion.v * 100), { emitEvent: false });
                    break;
                }
                case NumberInput.HEX: {
                    this.stringInputFormControl.setValue(color.toHex().toUpperCase().substring(1), { emitEvent: false });
                    break;
                }
                case NumberInput.HSL: {
                    const conversion = color.toHSL();
                    this.firstInputFormControl.setValue(Math.round(this.h * 360), { emitEvent: false });
                    this.secondInputFormControl.setValue(Math.round(conversion.s * 100), { emitEvent: false });
                    this.thirdInputFormControl.setValue(Math.round(conversion.l * 100), { emitEvent: false });
                    break;
                }
                case NumberInput.XY: {
                    this.firstInputFormControl.setValue(this.x - (this.x % 0.001), { emitEvent: false });
                    this.secondInputFormControl.setValue(this.y - (this.y % 0.001), { emitEvent: false });
                    break;
                }
            }
        }
    }

    /**
     * The currently selected color.
     */
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

    /**
     * The position of the round color selector in the {@link ColorPickerComponent#squareCanvas|`squareCanvas`}.
     */
    protected get squareSelectorPosition(): Point {
        if (this._formControl.value?.base == DatumTypeColorBase.XY) {
            return { x: this.x, y: 1 - this.y };
        } else {
            return { x: this.s, y: this.v };
        }
    }

    /**
     * The label for the first numerical input field, according to the current selected
     * {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
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

    /**
     * The label for the second numerical input field, according to the current selected
     * {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
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

    /**
     * The label for the third numerical input field, according to the current selected
     * {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
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

    /**
     * The label for the string input field, according to the current selected
     * {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
    public get stringInputLabel(): string | null {
        if (this._formControl.value?.base == DatumTypeColorBase.RGB && this.numberInputsFormControl.value == NumberInput.HEX) {
            return 'Hex';
        } else {
            return null;
        }
    }

    /**
     * The upper bound for the first numerical input field, according to the current selected
     * {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
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

    /**
     * The unit suffix for the first numerical input field, according to the current selected
     * {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
    public get firstInputSuffix(): string {
        switch (this._formControl.value?.base) {
            case DatumTypeColorBase.XY: {
                return '';
            }
            case DatumTypeColorBase.RGB: {
                switch (this.numberInputsFormControl.value) {
                    case NumberInput.RGB:
                        return '';
                    case NumberInput.HSB:
                    case NumberInput.HSL:
                        return '°';
                    case null:
                    case NumberInput.HEX:
                    case NumberInput.XY:
                        return '';
                }
                break;
            }
            case undefined: {
                return '';
            }
        }
    }

    /**
     * The upper bound for the second numerical input field, according to the current selected
     * {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
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

    /**
     * The unit suffix for the second numerical input field, according to the current selected
     * {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
    public get secondInputSuffix(): string {
        switch (this._formControl.value?.base) {
            case DatumTypeColorBase.XY: {
                return '';
            }
            case DatumTypeColorBase.RGB: {
                switch (this.numberInputsFormControl.value) {
                    case NumberInput.RGB:
                        return '';
                    case NumberInput.HSB:
                    case NumberInput.HSL:
                        return '%';
                    case null:
                    case NumberInput.HEX:
                    case NumberInput.XY:
                        return '';
                }
                break;
            }
            case undefined: {
                return '';
            }
        }
    }

    /**
     * The upper bound for the third numerical input field, according to the current selected
     * {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
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

    /**
     * The unit suffix for the third numerical input field, according to the current selected
     * {@link ColorPickerComponent#base|`base`} and {@link ColorPickerComponent#numberInputsFormControl|number input}.
     */
    public get thirdInputSuffix(): string {
        switch (this._formControl.value?.base) {
            case DatumTypeColorBase.XY: {
                return '';
            }
            case DatumTypeColorBase.RGB: {
                switch (this.numberInputsFormControl.value) {
                    case NumberInput.RGB:
                        return '';
                    case NumberInput.HSB:
                    case NumberInput.HSL:
                        return '%';
                    case null:
                    case NumberInput.HEX:
                    case NumberInput.XY:
                        return '';
                }
                break;
            }
            case undefined: {
                return '';
            }
        }
    }

    /** Which canvas is currently being dragged. `null` if no dragging is currently being performed. */
    protected dragging: null | 'SQUARE' | 'VERT' = null;
    /** The bounds of the canvas that is currently being dragged. `null` if no dragging is currently being performed. */
    protected draggingBounds: DOMRect | null = null;

    /**
     * Mouse down event for the {@link ColorPickerComponent#squareCanvas|`squareCanvas`}.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected squareMouseDown(event: MouseEvent): void {
        if (this.dragging == null && event.button == 0) {
            this.dragging = 'SQUARE';
            this.draggingBounds = (event.target as Element | null)?.getBoundingClientRect() ?? null;
            this.squareMouseMove(event);
        }
    }

    /**
     * Mouse move event on the {@link ColorPickerComponent#squareCanvas|`squareCanvas`}.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected squareMouseMove(event: MouseEvent): void {
        if (this.dragging == 'SQUARE') {
            const rect = this.draggingBounds;
            if (rect === null) {
                return;
            }
            const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
            const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
            if (this._base == DatumTypeColorBase.XY) {
                this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.XY, x, 1 - y));
                this.x = x;
                this.y = 1 - y;
            } else {
                this.s = x;
                this.v = y;
                const color = Color.hsv(this.h, this.s, this.v);
                this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.RGB, Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)));
            }
            this.updateInputs();
        }
    }

    /**
     * Mouse up event on the {@link ColorPickerComponent#squareCanvas|`squareCanvas`}.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected squareMouseUp(event: MouseEvent): void {
        if (this.dragging == 'SQUARE') {
            this.squareMouseMove(event);
            this.dragging = null;
        }
    }

    /**
     * Mouse down event on the {@link ColorPickerComponent#verticalCanvas|`verticalCanvas`}.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected verticalMouseDown(event: MouseEvent): void {
        if (this.dragging == null && event.button == 0) {
            this.dragging = 'VERT';
            this.draggingBounds = (event.target as Element | null)?.getBoundingClientRect() ?? null;
            this.verticalMouseMove(event);
        }
    }

    /**
     * Mouse move event on the {@link ColorPickerComponent#verticalCanvas|`verticalCanvas`}.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected verticalMouseMove(event: MouseEvent): void {
        if (this.dragging == 'VERT') {
            const rect = this.draggingBounds;
            if (rect === null) {
                return;
            }
            const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
            if (this._base == DatumTypeColorBase.RGB) {
                this.h = y;
                const color = Color.hsv(this.h, this.s, this.v);
                this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.RGB, Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)));
                this.repaint();
                this.updateInputs();
            }
        }
    }

    /**
     * Mouse up event on the {@link ColorPickerComponent#verticalCanvas|`verticalCanvas`}.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected verticalMouseUp(event: MouseEvent): void {
        if (this.dragging == 'VERT') {
            this.verticalMouseMove(event);
            this.dragging = null;
        }
    }

    /**
     * Key up event on the {@link ColorPickerComponent#verticalCanvas|`verticalCanvas`}.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    protected verticalKey(event: KeyboardEvent): void {
        if (event.key == 'ArrowDown') {
            this.h += ((event.shiftKey ? 2 : event.altKey ? 0.5 : 1) * 10) / 360;
            if (this.h > 1) {
                this.h -= 1;
            }
        } else if (event.key == 'ArrowUp') {
            this.h -= ((event.shiftKey ? 2 : event.altKey ? 0.5 : 1) * 10) / 360;
            if (this.h < 0) {
                this.h += 1;
            }
        } else if (event.key == 'Home') {
            this.h = 0;
        } else if (event.key == 'End') {
            this.h = 1;
        } else {
            return;
        }
        const color = Color.hsv(this.h, this.s, this.v);
        this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.RGB, Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)));
        this.repaint();
        this.updateInputs();
    }

    /**
     * Key up event on the {@link ColorPickerComponent#squareCanvas|`squareCanvas`}.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    protected squareKey(event: KeyboardEvent): void {
        let x = this._base == DatumTypeColorBase.XY ? this.x : this.s;
        let y = this._base == DatumTypeColorBase.XY ? 1 - this.y : this.v;
        if (event.key == 'ArrowDown') {
            y += ((event.shiftKey ? 2 : event.altKey ? 0.5 : 1) * 10) / 360;
            if (y > 1) {
                y = 1;
            }
        } else if (event.key == 'ArrowUp') {
            y -= ((event.shiftKey ? 2 : event.altKey ? 0.5 : 1) * 10) / 360;
            if (y < 0) {
                y = 0;
            }
        } else if (event.key == 'ArrowRight') {
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
        } else if (event.key == 'PageDown') {
            y = 1;
        } else if (event.key == 'PageUp') {
            y = 0;
        } else {
            return;
        }
        if (this._base == DatumTypeColorBase.XY) {
            this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.XY, x, 1 - y));
            this.x = x;
            this.y = 1 - y;
        } else {
            this.s = x;
            this.v = y;
            const color = Color.hsv(this.h, this.s, this.v);
            this._formControl.setValue(new DatumTypeColor(DatumTypeColorBase.RGB, Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)));
        }
        this.updateInputs();
    }

    /**
     * Mouse move event on the scrim shown while dragging to extend the dragging to the whole window.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected scrimMouseMove(event: MouseEvent): void {
        if (this.dragging == 'SQUARE') {
            this.squareMouseMove(event);
        } else if (this.dragging == 'VERT') {
            this.verticalMouseMove(event);
        }
    }

    /**
     * Mouse up event on the scrim shown while dragging to extend the dragging to the whole window.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected scrimMouseUp(event: MouseEvent): void {
        if (this.dragging == 'SQUARE') {
            this.squareMouseUp(event);
        } else if (this.dragging == 'VERT') {
            this.verticalMouseUp(event);
        }
    }

    // ControlValueAccessor implementation

    /**
     * Implementation of {@link ControlValueAccessor#writeValue| `ControlValueAccessor.writeValue()`}.
     *
     * @param {DatumTypeColor} color - The value to write.
     */
    public writeValue(color: DatumTypeColor): void {
        if (this._formControl.value != color) {
            this._formControl.setValue(color, { emitEvent: false });
        }
    }

    /**
     * Change listener for {@link ColorPickerComponent#registerOnChange| `registerOnChange()`}.
     */
    protected onChange: ((value: DatumTypeColor) => void) | null = null;

    /**
     * Implementation of {@link ControlValueAccessor#registerOnChange| `ControlValueAccessor.registerOnChange()`}.
     *
     * @param {(value: DatumTypeColor) => void} fn - The listener.
     */
    public registerOnChange(fn: (value: DatumTypeColor) => void): void {
        this.onChange = fn;
    }

    /**
     * Touched listener for {@link ColorPickerComponent#registerOnTouched| `registerOnTouched()`}.
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

    /** @ignore */
    protected readonly DatumTypeColorBase = DatumTypeColorBase;
    /** @ignore */
    protected readonly Color = Color;
    /** @ignore */
    protected readonly NumberInput = NumberInput;
}

/**
 * The set values the inputs of a {@link ColorPickerComponent|`ColorPickerComponent`} are displaying and modifying.
 */
export enum NumberInput {
    /** Reed, Green, Blue. */
    RGB = 'RGB',
    /** Hue, Saturation, Brightness. */
    HSB = 'HSB',
    /** Hex format representation of RGB. */
    HEX = 'HEX',
    /** Hue, Saturation, Lightness. */
    HSL = 'HSL',
    /** CIE 1931 color space X and Y coordinates. */
    XY = 'XY',
}
