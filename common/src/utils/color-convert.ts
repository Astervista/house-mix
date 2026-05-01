/* eslint-disable jsdoc/require-description-complete-sentence */
/**
 * This is an adaptation in TypeScript of the script Color spaces by Thomas Lochmatter. Below the original credits.
 *
 * ---
 *
 * ### Color spaces
 *
 * <b>Author:</b> Thomas Lochmatter, <a href="https://viereck.ch/thomas">https://viereck.ch/thomas</a>
 *
 * <b>License:<b> MIT
 *
 * @see https://viereck.ch/hue-xy-rgb/ for explanations and code examples.
 * @see A good explanation of color spaces can be found <a href="https://babelcolor.com/index_htm_files/A%20review%20of%20RGB%20color%20spaces.pdf">here</a>.
 * @module
 */
/* eslint-enable jsdoc/require-description-complete-sentence */

/**
 * Restricts a value to a specific interval.
 *
 * @param {number} value - The value to restrict.
 * @param {number} min - The lower bound.
 * @param {number} max - The upper bound.
 * @returns {number} The bounded value.
 */
const bounded = (value: number, min: number, max: number): number => {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
};

/**
 * Restricts the value between 0 and 1.
 *
 * @param {number} value - The value to clamp.
 * @returns {number} The clamped value.
 */
function clamped(value: number): number {
    if (value < 0) {
        return 0;
    }
    if (value > 1) {
        return 1;
    }
    return value;
}

/**
 * Creates a string for a value, restricting it in the range `0x00` - `0xFF`, and writing it in non-prefixed hexadecimal notation.
 *
 * @param {number} value - The value.
 * @returns {string} The hex representation of value, restricted between `0x00` and `0xFF`.
 */
function hex(value: number): string {
    return colorComponent255(value).toString(16).padStart(2, "0");
}

/**
 * Serialization of the class {@link Color|`Color`}.
 */
export interface ColorJSON {
    /** Red value. */
    r: number,
    /** Green value. */
    g: number,
    /** Blue value. */
    b: number,
    /** Alpha value. */
    a: number
}

/** A color. All components are values between 0 and 1. */
export class Color {
    
    /** Red value (0~1). */
    public r: number;
    /** Green value (0~1). */
    public g: number;
    /** Blue value (0~1). */
    public b: number;
    /** Alpha value (0~1). */
    public a: number;
    
    /**
     * Create an instance of the class. All parameters must be values between 0 and 1.
     *
     * @param {number} r - Red value.
     * @param {number} g - Green value.
     * @param {number} b - Blue value.
     * @param {number} a - Alpha value.
     */
    constructor(r: number, g: number, b: number, a: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    
    /**
     * Represents the color in a css rgba(r, g, b, a) format.
     *
     * @returns {string} - `this` in css rgba(r, g, b, a) format.
     */
    public toString(): string {
        return this.toCSS();
    };
    
    /**
     * Create a new instance of the class with the same values.
     *
     * @returns {Color} The new instance.
     */
    public clone(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    };
    
    /**
     * Creates a Float32Array with the premultiplied color components (RGBA) for use with WebGl.
     *
     * @returns {Float32Array} The Float32Array representation of `this`.
     */
    public toGlColor(): Float32Array {
        return new Float32Array([this.r * this.a, this.g * this.a, this.b * this.a, this.a]);
    };
    
    /**
     * Returns a Float32Array with the premultiplied color components (RGB) for use with WebGl.
     *
     * @returns {Float32Array} The Float32Array representation of `this`.
     */
    public toGlColor3(): Float32Array {
        return new Float32Array([this.r * this.a, this.g * this.a, this.b * this.a]);
    };
    
    /**
     * Returns a CSS representation of the color.
     *
     * @returns {string} The CSS rgba string.
     */
    public toCSS(): string {
        const r = colorComponent255(this.r).toFixed(0);
        const g = colorComponent255(this.g).toFixed(0);
        const b = colorComponent255(this.b).toFixed(0);
        const a = bounded(this.a, 0, 1).toFixed(3);
        return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
    };
    
    /**
     * Returns the negative of the color.
     *
     * @returns {Color} The negative color.
     */
    public negative(): Color {
        return new Color(1 - this.r, 1 - this.g, 1 - this.b, this.a);
    }
    
    /**
     * Returns the black and white (grayscale) version of the color using luma.
     *
     * @returns {Color} The grayscale color.
     */
    public bw(): Color {
        const luma = 0.299 * this.r + 0.587 * this.g + 0.225 * this.b;
        return new Color(luma, luma, luma, this.a);
    }
    
    /**
     * Return a hex #rrggbb representation of the color. The opacity is ignored.
     *
     * @returns {string} The hex string.
     */
    public toHex(): string {
        return "#" + hex(this.r) + hex(this.g) + hex(this.b);
    };
    
    /**
     * Returns the color as integer in ARGB byte order.
     *
     * @returns {number} The ARGB integer.
     */
    public toARGBInteger(): number {
        return colorComponent255(this.a) * 0x1000000 + colorComponent255(this.r) * 0x10000 + colorComponent255(this.g) * 0x100 + colorComponent255(this.b);
    };
    
    /**
     * Returns the color as integer in RGB byte order.
     *
     * @returns {number} The RGB integer.
     */
    public toRGBInteger(): number {
        return colorComponent255(this.r) * 0x10000 + colorComponent255(this.g) * 0x100 + colorComponent255(this.b);
    };
    
    /**
     * Converts the color to HSV, expressed in percent points.
     *
     * @returns {{h: number, s: number, v: number}} The HSV components.
     */
    public toHSV(): { h: number, s: number, v: number } {
        
        let rr: number;
        let gg: number;
        let bb: number;
        let h: number;
        let s: number;
        const rabs           = this.r;
        const gabs           = this.g;
        const babs           = this.b;
        const v              = Math.max(rabs, gabs, babs);
        const diff           = v - Math.min(rabs, gabs, babs);
        const diffC          = (c: number): number => (v - c) / 6 / diff + 1 / 2;
        const percentRoundFn = (num: number): number => Math.round(num * 100) / 100;
        if (diff == 0) {
            h = s = 0;
        } else {
            s  = diff / v;
            rr = diffC(rabs);
            gg = diffC(gabs);
            bb = diffC(babs);
            
            if (rabs === v) {
                h = bb - gg;
            } else if (gabs === v) {
                h = (1 / 3) + rr - bb;
            } else if (babs === v) {
                h = (2 / 3) + gg - rr;
            } else {
                h = 0;
            }
            if (h < 0) {
                h += 1;
            } else if (h > 1) {
                h -= 1;
            }
        }
        return {
            h: percentRoundFn(h),
            s: percentRoundFn(s),
            v: percentRoundFn(v)
        };
    }
    
    /**
     * Converts the color to HSL, expressed in percent points.
     *
     * @returns {{h: number, s: number, l: number}} The HSL components.
     */
    public toHSL(): {h: number, s: number, l: number} {
        const color = this.toHSV();
        const l = color.v - color.v * color.s / 2;
        const m = Math.min(l, 1 - l);
        const sl = m ? (color.v - l) / m : 0;
        return {h: color.h, s: sl, l};
    }
    
    /**
     * Returns the color as a JSON object.
     *
     * @returns {ColorJSON} The JSON representation.
     */
    public toJson(): ColorJSON {
        return {r: this.r, g: this.g, b: this.b, a: this.a};
    };
    
    /**
     * Return the color with all components clamped to [0, 1].
     *
     * @returns {Color} The clamped color.
     */
    public clamped(): Color {
        return new Color(clamped(this.r), clamped(this.g), clamped(this.b), clamped(this.a));
        
    };
    
    /**
     * Creates a new color adding another color to `this`.
     *
     * @param {Color} color - The color to add.
     * @returns {Color} The resulting color.
     */
    public plus(color: Color): Color {
        return new Color(this.r + color.r, this.g + color.g, this.b + color.b, this.a + color.a);
    };
    
    /**
     * Creates a new color subtracting another color from `this`.
     *
     * @param {Color} color - The color to subtract.
     * @returns {Color} The resulting color.
     */
    public minus(color: Color): Color {
        return new Color(this.r - color.r, this.g - color.g, this.b - color.b, this.a - color.a);
    };
    
    /**
     * Creates a new color multiplying all the values of `this` by a factor.
     *
     * @param {number} factor - The multiplication factor.
     * @returns {Color} The resulting color.
     */
    public times(factor: number): Color {
        return new Color(this.r * factor, this.g * factor, this.b * factor, this.a * factor);
    };
    
    /**
     * Creates a new color mixing this color with another one.
     * This can also be used to darken (mix with black) or lighten (mix with white) colors.
     *
     * @param {Color} color - The color to mix with.
     * @param {number} ratio - The mixing ratio.
     * @returns {Color} The resulting color.
     */
    public mixed(color: Color, ratio: number): Color {
        const invRatio = 1 - ratio;
        return new Color(this.r * invRatio + color.r * ratio, this.g * invRatio + color.g * ratio, this.b * invRatio + color.b * ratio, this.a * invRatio + color.a * ratio);
    };
    
    /**
     * Returns a new color equal to `this`, but with no opacity.
     *
     * @returns {Color} The transparent color.
     */
    public transparent(): Color {
        return new Color(this.r, this.g, this.b, 0);
    };
    
    /**
     * Returns a new color equal to this with the specified opacity.
     *
     * @param {number} [opacity] - The opacity value. If not provided, the opacity is set to 1.
     * @returns {Color} The opaque color.
     */
    public opaque(opacity = 1): Color {
        return new Color(this.r, this.g, this.b, opacity);
    };
    
    /**
     * Calculates the distance between this color and another one.
     *
     * @param {Color} color - The other color.
     * @returns {number} The distance.
     */
    public distanceToColor(color: Color): number {
        return Math.sqrt(this.distanceToColorSquared(color));
    };
    
    /**
     * Calculates the squared distance between this color and another color.
     *
     * @param {Color} color - The other color.
     * @returns {number} The squared distance.
     */
    public distanceToColorSquared(color: Color): number {
        const dr = this.r - color.r;
        const dg = this.g - color.g;
        const db = this.b - color.b;
        const da = this.a - color.a;
        return dr * dr + dg * dg + db * db + da * da;
    };
    
    /**
     * Check whether this color is equal to another one.
     *
     * @param {Color} color - The other color.
     * @returns {boolean} `true` if the color is equal to this, `false` otherwise.
     */
    public equals(color: Color): boolean {
        return this.distanceToColor(color) < 0.001;
    };
    
    
    /**
     * Create a color from a JSON object.
     *
     * @param {ColorJSON | null} json - The JSON object.
     * @returns {Color | null} The color instance or null.
     */
    public static fromJson(json: ColorJSON | null): Color | null {
        if (!json) {
            return null;
        }
        return new Color(json.r, json.g, json.b, json.a);
    };
    
    /**
     * Creates a color from rgba components. All parameters must be values between 0 and 1.
     *
     * @param {number} r - Red.
     * @param {number} g - Green.
     * @param {number} b - Blue.
     * @param {number} a - Alpha.
     * @returns {Color} The color instance.
     */
    public static rgba1(r: number, g: number, b: number, a: number): Color {
        return new Color(r, g, b, a);
    };
    
    /**
     * Creates a color from rgba components. All parameters must be values between 0 and 255.
     *
     * @param {number} r - Red.
     * @param {number} g - Green.
     * @param {number} b - Blue.
     * @param {number} a - Alpha.
     * @returns {Color} The color instance.
     */
    public static rgba255(r: number, g: number, b: number, a: number): Color {
        return new Color(r / 255, g / 255, b / 255, a / 255);
    };
    
    /**
     * Creates a color. The parameters r, g, and b must be values between 0 and 255, and a must be
     * a value between 0 (transparent) and 1 (opaque). This corresponds to the CSS notation.
     *
     * @param {number} r - Red.
     * @param {number} g - Green.
     * @param {number} b - Blue.
     * @param {number} a - Alpha.
     * @returns {Color} The color instance.
     */
    public static rgba(r: number, g: number, b: number, a: number): Color {
        return new Color(r / 255, g / 255, b / 255, a);
    };
    
    /**
     * Creates a color. The parameters r, g, and b must be values between 0 and 255.
     * The opacity is set to 1.
     *
     * @param {number} r - Red.
     * @param {number} g - Green.
     * @param {number} b - Blue.
     * @returns {Color} The color instance.
     */
    public static rgb(r: number, g: number, b: number): Color {
        return new Color(r / 255, g / 255, b / 255, 1);
    };
    
    /**
     * Creates a color from HSV values.
     *
     * @param {number} h - Hue.
     * @param {number} s - Saturation.
     * @param {number} v - Value.
     * @returns {Color} The color instance.
     */
    public static hsv(h: number, s: number, v: number): Color {
        let r: number;
        let g: number;
        let b: number;
        const i: number = Math.floor(h * 6);
        const f: number = h * 6 - i;
        const p: number = v * (1 - s);
        const q: number = v * (1 - f * s);
        const t: number = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            default:
                r = v;
                g = p;
                b = q;
                break;
        }
        return new Color(
            r, g, b, 1
        );
    }
    
    /**
     * Creates a color from HSL values.
     *
     * @param {number} hue - Hue.
     * @param {number} saturation - Saturation.
     * @param {number} lightness - Lightness.
     * @returns {Color} The color instance.
     */
    public static hsl(hue: number, saturation: number, lightness: number): Color {
        const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
        const h = hue * 6;
        const x = c * (1 - Math.abs(h % 2 - 1));
        const m = lightness - c / 2;
        if (h < 1) {
            return new Color(m + c, m + x, m, 1);
        }
        if (h < 2) {
            return new Color(m + x, m + c, m, 1);
        }
        if (h < 3) {
            return new Color(m, m + c, m + x, 1);
        }
        if (h < 4) {
            return new Color(m, m + x, m + c, 1);
        }
        if (h < 5) {
            return new Color(m + x, m, m + c, 1);
        }
        return new Color(m + c, m, m + x, 1);
    };
    
    /**
     * Converts a 4-byte ARGB integer to a color.
     *
     * @param {number} value - The ARGB integer.
     * @returns {Color} The color instance.
     */
    public static fromARGBInteger(value: number): Color {
        const a = (value >> 24) & 0xff;
        const r = (value >> 16) & 0xff;
        const g = (value >> 8) & 0xff;
        const b = value & 0xff;
        return new Color(r / 255, g / 255, b / 255, a / 255);
    };
    
    /**
     * Converts a 3-byte RGB integer to a color.
     *
     * @param {number} value - The RGB integer.
     * @returns {Color} The color instance.
     */
    public static fromRGBInteger(value: number): Color {
        const r = (value >> 16) & 0xff;
        const g = (value >> 8) & 0xff;
        const b = value & 0xff;
        return new Color(r / 255, g / 255, b / 255, 1);
    };
    
    /**
     * Parses a color string (hex, rgb, rgba).
     *
     * @param {string} text - The color string.
     * @returns {Color | null} The color instance or null.
     */
    public static parse(text: string): Color | null {
        text = text.toLowerCase();
        const html6Match = /#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/.exec(text);
        
        if (html6Match) {
            const r = parseInt("0x" + (html6Match[1] ?? "00")) / 255;
            const g = parseInt("0x" + (html6Match[2] ?? "00")) / 255;
            const b = parseInt("0x" + (html6Match[3] ?? "00")) / 255;
            return new Color(r, g, b, 1);
        }
        
        const html3Match = /#([0-9a-f])([0-9a-f])([0-9a-f])/.exec(text);
        if (html3Match) {
            const r = parseInt("0x" + (html3Match[1] ?? "00") + (html3Match[1] ?? "00")) / 255;
            const g = parseInt("0x" + (html3Match[2] ?? "00") + (html3Match[2] ?? "00")) / 255;
            const b = parseInt("0x" + (html3Match[3] ?? "00") + (html3Match[3] ?? "00")) / 255;
            return new Color(r, g, b, 1);
        }
        
        const rgbMatch = /rgb\((\d+)[\s,](\d+)[\s,](\d+)\)/.exec(text);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1] ?? "0") / 255;
            const g = parseInt(rgbMatch[2] ?? "0") / 255;
            const b = parseInt(rgbMatch[3] ?? "0") / 255;
            return new Color(r, g, b, 1);
        }
        
        const rgbaMatch = /rgba\((\d+)[\s,](\d+)[\s,](\d+)[\s,]([\d.]+)\)/.exec(text);
        if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1] ?? "0") / 255;
            const g = parseInt(rgbaMatch[2] ?? "0") / 255;
            const b = parseInt(rgbaMatch[3] ?? "0") / 255;
            const a = parseFloat(rgbaMatch[4] ?? "0");
            return new Color(r, g, b, a);
        }
        
        return null;
    };
    
    /** The color black. */
    public static black            = new Color(0, 0, 0, 1);
    /** The color white. */
    public static white            = new Color(1, 1, 1, 1);
    /** The color transparent black. */
    public static transparentBlack = new Color(0, 0, 0, 0);
    /** The color transparent white. */
    public static transparentWhite = new Color(1, 1, 1, 0);
}

/**
 * Converts a color component from a 0-1 range to a 0-255 range.
 *
 * @param {number} value - The component value (0-1).
 * @returns {number} The component value (0-255).
 */
function colorComponent255(value: number): number {
    return bounded(Math.floor(value * 255), 0, 255);
}

/**
 * Represents a point in the CIE 1931 xy chromaticity space.
 */
export interface XY {
    /** The x chromaticity coordinate. */
    x: number,
    /** The y chromaticity coordinate. */
    y: number
}

/**
 * Represents a color in the CIE 1931 XYZ color space.
 */
export interface XYZ {
    /** The X tristimulus value (mix of LMS cone responses). */
    x: number,
    /** The Y tristimulus value (luminance). */
    y: number,
    /** The Z tristimulus value (quasi-blue). */
    z: number
}

/**
 * Represents a color in the CIE 1931 xyY color space, where Y is luminance.
 */
export interface XYY {
    /** The x chromaticity coordinate. */
    x: number,
    /** The y chromaticity coordinate. */
    y: number,
    /** The Y luminance component. */
    Y: number
}

/**
 * Calculates the Euclidean distance between two points in 2D space.
 *
 * @param {XY} pointA - The first point.
 * @param {XY} pointB - The second point.
 * @returns {number} The distance.
 */
function lineDistance(pointA: XY, pointB: XY): number {
    return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
}

/**
 * Finds the point on a line segment (defined by pointA and pointB) that is closest to a given point.
 *
 * @param {XY} xyPoint - The reference point.
 * @param {XY} pointA - The start of the line segment.
 * @param {XY} pointB - The end of the line segment.
 * @returns {XY} The closest point on the line.
 */
function closestPoint(xyPoint: XY, pointA: XY, pointB: XY): XY {
    const xy2a         = subXY(xyPoint, pointA);
    const a2b          = subXY(pointB, pointA);
    const a2bSqr       = Math.pow(a2b.x, 2) + Math.pow(a2b.y, 2);
    const xy2a_dot_a2b = xy2a.x * a2b.x + xy2a.y * a2b.y;
    const t            = xy2a_dot_a2b / a2bSqr;
    return xy(pointA.x + a2b.x * t, pointA.y + a2b.y * t);
}

/**
 * Represents a color gamut defined by three primary colors (red, green, blue) in the CIE 1931 xy space.
 */
export class Gamut {
    
    /** The red primary point. */
    public red: XY;
    /** The green primary point. */
    public green: XY;
    /** The blue primary point. */
    public blue: XY;
    
    /**
     * Create an instance of the class.
     *
     * @param {number} rx - Red x.
     * @param {number} ry - Red y.
     * @param {number} gx - Green x.
     * @param {number} gy - Green y.
     * @param {number} bx - Blue x.
     * @param {number} by - Blue y.
     */
    constructor(rx: number, ry: number, gx: number, gy: number, bx: number, by: number) {
        this.red   = xy(rx, ry);
        this.green = xy(gx, gy);
        this.blue  = xy(bx, by);
    }
    
    /**
     * Checks whether a given xy point is inside the gamut triangle.
     * Uses barycentric coordinates for the calculation.
     *
     * @param {XY} xyPoint - The point to check.
     * @returns {boolean} `true` if the point is inside, `false` otherwise.
     */
    public isInside(xyPoint: XY): boolean {
        const v0 = subXY(this.blue, this.red);
        const v1 = subXY(this.green, this.red);
        const v2 = subXY(xyPoint, this.red);
        
        const dot00 = v0.x * v0.x + v0.y * v0.y;
        const dot01 = v0.x * v1.x + v0.y * v1.y;
        const dot02 = v0.x * v2.x + v0.y * v2.y;
        const dot11 = v1.x * v1.x + v1.y * v1.y;
        const dot12 = v1.x * v2.x + v1.y * v2.y;
        
        const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
        
        const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        return u >= 0 && v >= 0 && u + v < 1;
    };
    
    /**
     * Returns the closest point on the gamut's perimeter to the given xy point.
     *
     * @param {XY} xyPoint - The reference point.
     * @returns {XY} The closest point within the gamut.
     */
    public closest(xyPoint: XY): XY {
        
        const greenBluePoint = closestPoint(xyPoint, this.green, this.blue);
        const greenRedPoint  = closestPoint(xyPoint, this.green, this.red);
        const blueRedPoint   = closestPoint(xyPoint, this.blue, this.red);
        
        const greenBlueDistance = lineDistance(xyPoint, greenBluePoint);
        const greenRedDistance  = lineDistance(xyPoint, greenRedPoint);
        const blueRedDistance   = lineDistance(xyPoint, blueRedPoint);
        
        if (greenBlueDistance < greenRedDistance && greenBlueDistance < blueRedDistance) {
            return greenBluePoint;
        }
        if (greenRedDistance < blueRedDistance) {
            return greenRedPoint;
        }
        return blueRedPoint;
    };
    
    /** A default gamut where no restriction is applied (covers the unit square). */
    public static none = new Gamut(1, 0, 0, 1, 0, 0);
    
}

/**
 * Helper function to create an {@link XY|` XY`} object.
 *
 * @param {number} x - The x coordinate.
 * @param {number} y - The y coordinate.
 * @returns {XY} The XY point.
 */
function xy(x: number, y: number): XY {
    return {x, y};
}

/**
 * Subtracts two XY points.
 *
 * @param {XY} a - The first point.
 * @param {XY} b - The second point.
 * @returns {XY} The resulting vector.
 */
function subXY(a: XY, b: XY): XY {
    return xy(a.x - b.x, a.y - b.y);
}

/**
 * A 3D vector.
 */
export class Vector3 {
    
    /**
     * Create an instance of the class.
     *
     * @param {number} x - X component.
     * @param {number} y - Y component.
     * @param {number} z - Z component.
     */
    constructor(public x: number, public y: number, public z: number) {
    }
    
    /**
     * Returns a string representation of the vector.
     *
     * @returns {string} The string representation.
     */
    public toString(): string {
        return "vector3(" + this.x.toPrecision(6) + ", " + this.y.toPrecision(6) + ", " + this.z.toPrecision(6) + ")";
    };
    
    /**
     * Returns the length of the vector.
     *
     * @returns {number} The length.
     */
    public length(): number {
        return distance3(this.x, this.y, this.z);
    };
    
    /**
     * Returns the 3D squared length of the vector.
     *
     * @returns {number} The squared length.
     */
    public lengthSquared(): number {
        return distanceSquared3(this.x, this.y, this.z);
    };
    
    /**
     * Creates a unit vector pointing in the same direction as `this`.
     *
     * @returns {Vector3} The unit vector.
     */
    public unit(): Vector3 {
        const d = this.length();
        return new Vector3(this.x / d, this.y / d, this.z / d);
    };
    
    /**
     * Creates a new vector by adding another vector to `this`.
     *
     * @param {Vector3} v - The vector to add.
     * @returns {Vector3} The resulting vector.
     */
    public plus(v: Vector3): Vector3 {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    };
    
    /**
     * Creates a new vector by subtracting another vector from `this`.
     *
     * @param {Vector3} v - The vector to subtract.
     * @returns {Vector3} The resulting vector.
     */
    public minus(v: Vector3): Vector3 {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    };
    
    /**
     * Creates a new vector multiplying the coordinates of`this` by a scalar value.
     *
     * @param {number} value - The scalar value.
     * @returns {Vector3} The resulting vector.
     */
    public timesScalar(value: number): Vector3 {
        return new Vector3(this.x * value, this.y * value, this.z * value);
    };
    
    /**
     * Creates a new vector with all components of this vector negated.
     *
     * @returns {Vector3} The reversed vector.
     */
    public reversed(): Vector3 {
        return new Vector3(-this.x, -this.y, -this.z);
    };
    
    /**
     * Calculates the dot product of this vector and another vector.
     *
     * @param {Vector3} v - The other vector.
     * @returns {number} The dot product.
     */
    public dot(v: Vector3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    };
    
    /**
     * Calculates the cross product of this vector and another vector.
     *
     * @param {Vector3} v - The other vector.
     * @returns {Vector3} The resulting vector.
     */
    public cross(v: Vector3): Vector3 {
        return new Vector3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x);
    };
    
    /**
     * Returns whether this vector is equal to another one.
     *
     * @param {Vector3} v - The other vector.
     * @returns {boolean} `true` if the vector is equal to this, `false` otherwise.
     */
    public equals(v: Vector3): boolean {
        return this.x == v.x && this.y == v.y && this.z == v.z;
    };
    
    /**
     * Returns an array with the components of this vector.
     *
     * @returns {number[]} The array [x, y, z].
     */
    public toArray(): number[] {
        return [this.x, this.y, this.z];
    };
    
    /**
     * Returns a Float32Array with the components of this vector for use with WebGl.
     *
     * @returns {Float32Array} The Float32Array [x, y, z].
     */
    public toGlArray(): Float32Array {
        return new Float32Array([this.x, this.y, this.z]);
    };
    
    /**
     * Returns an array with the components of this vector and a 4th component set to 1.
     * This is used for affine transformations using a 4x4 matrix.
     *
     * @returns {number[]} The array [x, y, z, 1].
     */
    public toArray4(): number[] {
        return [this.x, this.y, this.z, 1];
    };
    
    /**
     * Creates a vector from an array with 3 numbers.
     *
     * @param {number[]} array - The array [x, y, z].
     * @returns {Vector3 | null} The vector instance or null.
     */
    public static fromArray(array: number[]): Vector3 | null {
        if (!Array.isArray(array)) {
            return null;
        }
        return new Vector3(array[0] ?? 0, array[1] ?? 0, array[2] ?? 0);
    };
    
}


/**
 * Calculates the Euclidean distance in 3D space.
 *
 * @param {number} dx - The difference in X.
 * @param {number} dy - The difference in Y.
 * @param {number} dz - The difference in Z.
 * @returns {number} The distance.
 */
function distance3(dx: number, dy: number, dz: number): number {
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates the squared Euclidean distance in 3D space.
 *
 * @param {number} dx - The difference in X.
 * @param {number} dy - The difference in Y.
 * @param {number} dz - The difference in Z.
 * @returns {number} The squared distance.
 */
function distanceSquared3(dx: number, dy: number, dz: number): number {
    return dx * dx + dy * dy + dz * dz;
}

/**
 * A 3x3 matrix.
 */
export class Matrix3 {
    /**
     * Create an instance of the class.
     *
     * @param {number[]} elements - The 9 elements of the matrix in row-major order.
     */
    constructor(public elements: number[]) {
    }
    
    /**
     * Creates an identity matrix.
     *
     * @returns {Matrix3} The identity matrix.
     */
    public static createIdentity(): Matrix3 {
        return new Matrix3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    }
    
    /**
     * Creates a matrix with the specified column vectors.
     *
     * @param {Vector3} c1 - The first column vector.
     * @param {Vector3} c2 - The second column vector.
     * @param {Vector3} c3 - The third column vector.
     * @returns {Matrix3} The resulting matrix.
     */
    public static createWithColumnVectors(c1: Vector3, c2: Vector3, c3: Vector3): Matrix3 {
        return new Matrix3([
                               c1.x, c2.x, c3.x,
                               c1.y, c2.y, c3.y,
                               c1.z, c2.z, c3.z
                           ]);
    };
    
    /**
     * Creates a matrix with the specified column vectors limited to 2D, the third column as [0, 0, 1] and the third row as [0, 0, 1].
     *
     * @param {Vector3} c1 - The first column vector.
     * @param {Vector3} c2 - The second column vector.
     * @returns {Matrix3} The resulting matrix.
     */
    public static createWithColumnVectors2(c1: Vector3, c2: Vector3): Matrix3 {
        return new Matrix3([
                               c1.x, c2.x, 0,
                               c1.y, c2.y, 0,
                               0, 0, 1
                           ]);
    };
    
    /**
     * Creates a translation matrix.
     *
     * @param {Vector3} vector - The translation vector.
     * @returns {Matrix3} The translation matrix.
     */
    public static createTranslation(vector: Vector3): Matrix3 {
        return new Matrix3([
                               1, 0, vector.x,
                               0, 1, vector.y,
                               0, 0, 1
                           ]);
    };
    
    /**
     * Creates a scaling matrix.
     *
     * @param {Vector3} vector - The scaling vector.
     * @returns {Matrix3} The scaling matrix.
     */
    public static createScaling(vector: Vector3): Matrix3 {
        return new Matrix3([
                               vector.x, 0, 0,
                               0, vector.y, 0,
                               0, 0, 1
                           ]);
    };
    
    /**
     * Creates a rotation matrix around the Z axis.
     *
     * @param {number} angle - The rotation angle in radians.
     * @returns {Matrix3} The rotation matrix.
     */
    public static createRotation(angle: number): Matrix3 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Matrix3([
                               c, -s, 0,
                               s, c, 0,
                               0, 0, 1
                           ]);
    };
    
    /**
     * Returns the element at the specified position.
     *
     * @param {number} x - The column index (0-2).
     * @param {number} y - The row index (0-2).
     * @returns {number} The element value.
     */
    public e(x: number, y: number): number {
        return this.elements[y * 3 + x] ?? 0;
    };
    
    /**
     * Returns the specified row as an array.
     *
     * @param {number} y - The row index (0-2).
     * @returns {number[]} The row elements.
     */
    public row(y: number): number[] {
        return this.elements.slice(y * 3, y * 3 + 3);
    };
    
    /**
     * Returns the specified row as a vector.
     *
     * @param {number} y - The row index (0-2).
     * @returns {Vector3} The row vector.
     */
    public rowVector(y: number): Vector3 {
        return new Vector3(this.elements[y * 3] ?? 0, this.elements[y * 3 + 1] ?? 0, this.elements[y * 3 + 2] ?? 0);
    };
    
    /**
     * Returns the specified column as an array.
     *
     * @param {number} x - The column index (0-2).
     * @returns {number[]} The column elements.
     */
    public column(x: number): number[] {
        return [this.elements[x] ?? 0, this.elements[3 + x] ?? 0, this.elements[6 + x] ?? 0];
    };
    
    /**
     * Returns the specified column as a vector.
     *
     * @param {number} x - The column index (0-2).
     * @returns {Vector3} The column vector.
     */
    public columnVector(x: number): Vector3 {
        return new Vector3(this.elements[x] ?? 0, this.elements[3 + x] ?? 0, this.elements[6 + x] ?? 0);
    };
    
    /**
     * Returns the diagonal elements of the matrix.
     *
     * @returns {number[]} The diagonal elements.
     */
    public diagonal(): number [] {
        return [this.elements[0] ?? 0, this.elements[4] ?? 0, this.elements[8] ?? 0];
    };
    
    /**
     * Checks whether this matrix is equal to another one within a given precision.
     *
     * @param {Matrix3} that - The other matrix.
     * @param {number} precision - The precision.
     * @returns {boolean} `true` if the matrices are equal, `false` otherwise.
     */
    public equals(that: Matrix3, precision: number): boolean {
        if (!precision) {
            precision = 0;
        }
        for (let i = 0; i < 9; i++) {
            if (Math.abs((this.elements[i] ?? 0) - (that.elements[i] ?? 0)) > precision) {
                return false;
            }
        }
        return true;
    };
    
    /**
     * Creates a new instance of the class with the same values.
     *
     * @returns {Matrix3} The new instance.
     */
    public clone(): Matrix3 {
        return new Matrix3(this.elements.slice());
    };
    
    /**
     * Multiplies this matrix by another matrix.
     *
     * @param {Matrix3} matrix - The other matrix.
     * @returns {Matrix3} The resulting matrix.
     */
    public times(matrix: Matrix3): Matrix3 {
        const result: number[] = new Array<number>(9);
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const i   = y * 3 + x;
                result[i] = 0;
                for (let n = 0; n < 3; n++) {
                    result[i] = result[i] + (this.elements[y * 3 + n] ?? 0) * (matrix.elements[(n * 3) + x] ?? 0);
                }
            }
        }
        return new Matrix3(result);
    };
    
    /**
     * Multiplies this matrix by an array (vector).
     *
     * @param {number[]} array - The array [x, y, z].
     * @returns {number[]} The resulting array.
     */
    public timesArray(array: number[]): number[] {
        const result: number[] = new Array<number>(3);
        for (let i = 0; i < 3; i++) {
            result[i] = 0;
            for (let n = 0; n < 3; n++) {
                const number = result[i];
                if (number != undefined) {
                    result[i] = number + (this.elements[i * 3 + n] ?? 0) * (array[n] ?? 0);
                }
            }
        }
        return result;
    };
    
    /**
     * Multiplies this matrix by a vector.
     *
     * @param {Vector3} vector - The vector.
     * @returns {Vector3} The resulting vector.
     */
    public timesVector(vector: Vector3): Vector3 {
        const elements = this.elements;
        
        const component = (i: number): number => {
            return (elements[i * 3] ?? 0) * vector.x +
                   (elements[i * 3 + 1] ?? 0) * vector.y +
                   (elements[i * 3 + 2] ?? 0) * vector.z;
        };
        
        return new Vector3(component(0), component(1), component(2));
        
    };
    
    /**
     * Multiplies an array (vector) by this matrix.
     *
     * @param {number[]} array - The array [x, y, z].
     * @returns {number[]} The resulting array.
     */
    public arrayTimes(array: number[]): number[] {
        const result: number[] = new Array<number>(3);
        for (let i = 0; i < 3; i++) {
            result[i] = 0;
            for (let n = 0; n < 3; n++) {
                const number = result[i];
                if (number != undefined) {
                    result[i] = number + (array[n] ?? 0) * (this.elements[(n * 3) + i] ?? 0);
                }
            }
        }
        return result;
    };
    
    /**
     * Multiplies a vector by this matrix.
     *
     * @param {Vector3} vector - The vector.
     * @returns {Vector3} The resulting vector.
     */
    public vectorTimes(vector: Vector3): Vector3 {
        const elements  = this.elements;
        const component = (i: number): number => {
            return vector.x * (elements[i] ?? 0) +
                   vector.y * (elements[3 + i] ?? 0) +
                   vector.z * (elements[6 + i] ?? 0);
        };
        return new Vector3(component(0), component(1), component(2));
        
    };
    
    /**
     * Returns the transposed matrix.
     *
     * @returns {Matrix3} The transposed matrix.
     */
    public transposed(): Matrix3 {
        const result = new Array<number>(9);
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                result[y * 3 + x] = this.elements[x * 3 + y] ?? 0;
            }
        }
        return new Matrix3(result);
    };
    
    /**
     * Returns the inverse of the matrix, or null if the matrix is singular.
     *
     * @returns {Matrix3 | null} The inverse matrix or null.
     */
    public inversed(): Matrix3 | null {
        // Set inverse to the identity matrix
        const current = this.clone();
        const inverse = Matrix3.createIdentity();
        
        // Gaussian elimination (part 1)
        for (let i = 0; i < 3; i++) {
            // Get the diagonal term
            let d = current.elements[i * 3 + i] ?? 0;
            
            // If it is 0, there must be at least one row with a non-zero element (otherwise, the matrix is not invertible)
            if (d == 0) {
                let r = i + 1;
                while (r < 3 && Math.abs(current.elements[r * 3 + i] ?? 0) < 1e-10) r++;
                if (r == 3) {
                    return null;
                }  // i is the rank
                for (let c = 0; c < 3; c++) {
                    current.elements[i * 3 + c] = (current.elements[i * 3 + c] ?? 0) + (current.elements[r * 3 + c] ?? 0);
                    inverse.elements[i * 3 + c] = (inverse.elements[i * 3 + c] ?? 0) + (inverse.elements[r * 3 + c] ?? 0);
                }
                d = current.elements[i * 3 + i] ?? 0;
            }
            
            // Divide the row by the diagonal term
            const inv = 1 / d;
            for (let c = 0; c < 3; c++) {
                current.elements[i * 3 + c] = (current.elements[i * 3 + c] ?? 0) * (inv);
                inverse.elements[i * 3 + c] = (inverse.elements[i * 3 + c] ?? 0) * (inv);
            }
            
            // Divide all subsequent rows with a non-zero coefficient, and subtract the row
            for (let r = i + 1; r < 3; r++) {
                const p = current.elements[r * 3 + i] ?? 0;
                if (p != 0) {
                    for (let c = 0; c < 3; c++) {
                        current.elements[r * 3 + c] = (current.elements[r * 3 + c] ?? 0) - (current.elements[i * 3 + c] ?? 0) * p;
                        inverse.elements[r * 3 + c] = (inverse.elements[r * 3 + c] ?? 0) - (inverse.elements[i * 3 + c] ?? 0) * p;
                    }
                }
            }
        }
        
        // Gaussian elimination (part 2)
        for (let i = 3 - 1; i >= 0; i--) {
            for (let r = 0; r < i; r++) {
                const d = current.elements[r * 3 + i] ?? 0;
                for (let c = 0; c < 3; c++) {
                    current.elements[r * 3 + c] = (current.elements[r * 3 + c] ?? 0) - (current.elements[i * 3 + c] ?? 0) * d;
                    inverse.elements[r * 3 + c] = (inverse.elements[r * 3 + c] ?? 0) - (inverse.elements[i * 3 + c] ?? 0) * d;
                }
            }
        }
        
        return inverse;
    };
    
    
    /**
     * Calculates the determinant of the matrix.
     *
     * @returns {number} The determinant.
     */
    public determinant(): number {
        const elements = this.elements;
        const det2     = (x0: number, x1: number): number => {
            return (elements[3 + x0] ?? 0) * (elements[6 + x1] ?? 0)
                   - (elements[3 + x1] ?? 0) * (elements[6 + x0] ?? 0);
        };
        return (elements[0] ?? 0) * det2(1, 2)
               - (elements[1] ?? 0) * det2(0, 2)
               + (elements[2] ?? 0) * det2(0, 1);
        
    };
    
    /**
     * Returns a new matrix that is the result of rotating this matrix.
     *
     * @param {number} angle - The rotation angle in radians.
     * @returns {Matrix3} The resulting matrix.
     */
    public rotated(angle: number): Matrix3 {
        return Matrix3.createRotation(angle).times(this);
    };
    
    /**
     * Returns a new matrix that is the result of translating this matrix.
     *
     * @param {Vector3} vector - The translation vector.
     * @returns {Matrix3} The resulting matrix.
     */
    public translated(vector: Vector3): Matrix3 {
        return Matrix3.createTranslation(vector).times(this);
    };
    
    /**
     * Returns a new matrix that is the result of scaling this matrix.
     *
     * @param {Vector3} vector - The scaling vector.
     * @returns {Matrix3} The resulting matrix.
     */
    public scaled(vector: Vector3): Matrix3 {
        return Matrix3.createScaling(vector).times(this);
    };
    
    
}


/**
 * Gamma correction parameters and transformation logic.
 */
export class GammaCorrection {
    
    /** Inverse of the gamma value. */
    public gammaInv: number;
    /** The transition point in the transformed space. */
    public transitionInv: number;
    /** Inverse of the slope value. */
    public slopeInv: number;
    
    /**
     * Create an instance of the class.
     *
     * @param {number} gamma - The gamma exponent.
     * @param {number} transition - The transition point from linear to power function.
     * @param {number} slope - The slope of the linear part.
     * @param {number} offset - The offset for the power function.
     */
    constructor(public gamma: number, public transition: number, public slope: number, public offset: number) {
        this.gammaInv      = 1 / gamma;
        this.transitionInv = this.transform(transition);
        this.slopeInv      = 1 / slope;
        
    }
    
    /**
     * Applies the gamma transformation (linear to non-linear).
     *
     * @param {number} value - The linear value.
     * @returns {number} The gamma-corrected value.
     */
    public transform(value: number): number {
        return value <= this.transition ? this.slope * value : (1 + this.offset) * Math.pow(value, this.gamma) - this.offset;
    };
    
    /**
     * Applies the inverse gamma transformation (non-linear to linear).
     *
     * @param {number} value - The gamma-corrected value.
     * @returns {number} The linear value.
     */
    public invTransform(value: number): number {
        return value <= this.transitionInv ? value * this.slopeInv : Math.pow((value + this.offset) / (1 + this.offset), this.gammaInv);
    };
    
}

// No gamma correction.
/**
 * A gamma correction implementation that performs no transformation.
 * This is used for color spaces that are already linear.
 */
export class NoGammaCorrection extends GammaCorrection {
    /**
     * Create an instance of the class.
     */
    constructor() {
        super(0, 0, 0, 0);
    }
    
    /**
     * Returns the value as-is (identity transformation).
     *
     * @param {number} value - The input value.
     * @returns {number} The same value.
     */
    public override transform(value: number): number { return value; };
    
    /**
     * Returns the value as-is (identity transformation).
     *
     * @param {number} value - The input value.
     * @returns {number} The same value.
     */
    public override invTransform(value: number): number { return value; };
}

/**
 * A color space. The matrix is a Matrix3 to transform (gamma-corrected) RGB values to XYZ coordinates.
 */
export class ColorSpace {
    
    /** The inverse of the transformation matrix. */
    public matrixInv: Matrix3 | null;
    
    /**
     * Create an instance of the class.
     *
     * @param {Matrix3} matrix - The transformation matrix.
     * @param {GammaCorrection} gammaCorrection - The gamma correction logic.
     */
    constructor(public matrix: Matrix3, public gammaCorrection: GammaCorrection) {
        this.matrixInv = matrix.inversed();
    }
    
    /**
     * Transforms a color to XYZ coordinates. The alpha component is ignored.
     *
     * @param {Color} color - The color to transform.
     * @returns {XYZ} The XYZ coordinates.
     */
    public xyzFromColor(color: Color): XYZ {
        const rgb = [
            this.gammaCorrection.invTransform(color.r),
            this.gammaCorrection.invTransform(color.g),
            this.gammaCorrection.invTransform(color.b)
        ];
        
        const xyz = this.matrix.timesArray(rgb);
        return {
            x: xyz[0] ?? 0,
            y: xyz[1] ?? 0,
            z: xyz[2] ?? 0
        };
    };
    
    /**
     * Transforms a color to xyY coordinates.
     *
     * @param {Color} color - The color to transform.
     * @returns {XYY} The xyY coordinates.
     */
    public xyYFromColor(color: Color): XYY {
        if (color.r < 1e-12 && color.g < 1e-12 && color.b < 1e-12) {
            const xyz = this.xyzFromColor(Color.white);
            const sum = xyz.x + xyz.y + xyz.z;
            return {
                x: xyz.x / sum,
                y: xyz.y / sum,
                Y: 0
            };
        }
        
        const xyz = this.xyzFromColor(color);
        const sum = xyz.x + xyz.y + xyz.z;
        return {
            x: xyz.x / sum,
            y: xyz.y / sum,
            Y: xyz.y
        };
    };
    
    /**
     * Transforms XYZ coordinates to a color.
     *
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} z - Z coordinate.
     * @param {boolean} [clamp] - Whether to clamp the resulting color components. Defaults to `true`.
     * @returns {Color} The color instance.
     */
    public colorFromXYZ(x: number, y: number, z: number, clamp: boolean = true): Color {
        const rgb = this.matrixInv?.timesArray([x, y, z]) ?? [0, 0, 0];
        if (clamp) {
            return new Color(
                Math.min(1, Math.max(0, this.gammaCorrection.transform(rgb[0] ?? 0))),
                Math.min(1, Math.max(0, this.gammaCorrection.transform(rgb[1] ?? 0))),
                Math.min(1, Math.max(0, this.gammaCorrection.transform(rgb[2] ?? 0))),
                1
            );
        } else {
            return new Color(
                this.gammaCorrection.transform(rgb[0] ?? 0),
                this.gammaCorrection.transform(rgb[1] ?? 0),
                this.gammaCorrection.transform(rgb[2] ?? 0),
                1
            );
        }
    };
    
    /**
     * Transforms xyY coordinates to a color.
     *
     * @param {number} x - The x coordinate.
     * @param {number} y - The y coordinate.
     * @param {number} Y - The Y (luminance) coordinate.
     * @param {boolean} [clamp] - Whether to clamp the resulting color components. Defaults to `true`.
     * @returns {Color} The color instance.
     */
    public colorFromXYY(x: number, y: number, Y: number, clamp: boolean = true): Color {
        if (y == 0) {
            y = 1e-12;
        }
        const z = 1.0 - x - y;
        return this.colorFromXYZ((Y / y) * x, Y, (Y / y) * z, clamp);
    };
    
    /**
     * Transforms xy coordinates to a color with maximum intensity.
     *
     * @param {number} x - The x coordinate.
     * @param {number} y - The y coordinate.
     * @param {boolean} [clamp] - Whether to clamp the resulting color components. Defaults to `true`.
     * @returns {Color} The color instance.
     */
    public colorFromXY(x: number, y: number, clamp: boolean = true): Color {
        return this.colorFromXYY(x, y, this.findMaximumY(x, y), clamp);
    };
    
    /**
     * Finds the maximum luminance (Y) for a given xy coordinate that stays within the gamut.
     *
     * @param {number} x - The x coordinate.
     * @param {number} y - The y coordinate.
     * @param {number} [iterations] - Number of iterations for the search. Defaults to `10`.
     * @returns {number} The maximum Y value.
     */
    public findMaximumY(x: number, y: number, iterations = 10): number {
        let bri = 1;
        for (let i = 0; i < iterations; i++) {
            const color = this.colorFromXYY(x, y, bri);
            const max   = Math.max(color.r, color.g, color.b);
            bri         = bri / max;
        }
        
        return bri;
    };
    
    /** The sRGB color space. */
    public static sRGB = new ColorSpace(new Matrix3([
                                                        0.412453, 0.35758, 0.180423,
                                                        0.212671, 0.71516, 0.072169,
                                                        0.019334, 0.119193, 0.950227
                                                    ]), new GammaCorrection(0.42, 0.0031308, 12.92, 0.055));
    
    /** A wide gamut color space. */
    public static wide = new ColorSpace(new Matrix3([
                                                        0.7164, 0.1010, 0.1468,
                                                        0.2587, 0.7247, 0.0166,
                                                        0.0000, 0.0512, 0.7740
                                                    ]), new NoGammaCorrection());
    
    /** The Adobe RGB color space. */
    public static adobeRGB = new ColorSpace(new Matrix3([
                                                            0.5767, 0.1856, 0.1882,
                                                            0.2974, 0.6273, 0.0753,
                                                            0.0270, 0.0707, 0.9911
                                                        ]), new NoGammaCorrection());
}

