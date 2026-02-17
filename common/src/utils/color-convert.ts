// Color spaces
//
// Author: Thomas Lochmatter, https://viereck.ch/thomas
// License: MIT
//
// See https://viereck.ch/hue-xy-rgb/ for explanations and code examples.
// A good explanation of color spaces can be found here: https://babelcolor.com/index_htm_files/A%20review%20of%20RGB%20color%20spaces.pdf

const bounded = (value: number, min: number, max: number): number => {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
};


function clamped(value: number): number {
    if (value < 0) {
        return 0;
    }
    if (value > 1) {
        return 1;
    }
    return value;
}

function hex(value: number): string {
    return colorComponent255(value).toString(16).padStart(2, "0");
}

export interface ColorJSON {
    r: number,
    g: number,
    b: number,
    a: number
}

// A color. All components are values between 0 and 1.
export class Color {
    
    public r: number;
    public g: number;
    public b: number;
    public a: number;
    
    constructor(r: number, g: number, b: number, a: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    
    public toString(): string {
        return this.toCSS();
    };
    
    public clone(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    };
    
    // Returns a Float32Array with the premultiplied color components (RGBA) for use with WebGl.
    public toGlColor(): Float32Array {
        return new Float32Array([this.r * this.a, this.g * this.a, this.b * this.a, this.a]);
    };
    
    // Returns a Float32Array with the premultiplied color components (RGB) for use with WebGl.
    public toGlColor3(): Float32Array {
        return new Float32Array([this.r * this.a, this.g * this.a, this.b * this.a]);
    };
    
    // Returns a CSS representation of the color.
    public toCSS(): string {
        const r = colorComponent255(this.r).toFixed(0);
        const g = colorComponent255(this.g).toFixed(0);
        const b = colorComponent255(this.b).toFixed(0);
        const a = bounded(this.a, 0, 1).toFixed(3);
        return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
    };
    
    public negative(): Color {
        return new Color(1 - this.r, 1 - this.g, 1 - this.b, this.a);
    }
    
    public bw(): Color {
        const luma = 0.299 * this.r + 0.587 * this.g + 0.225 * this.b;
        return new Color(luma, luma, luma, this.a);
    }
    
    // Return a hex representation of the color. The opacity is ignored.
    public toHex(): string {
        return "#" + hex(this.r) + hex(this.g) + hex(this.b);
    };
    
    // Returns the color as integer in ARGB byte order.
    public toARGBInteger(): number {
        return colorComponent255(this.a) * 0x1000000 + colorComponent255(this.r) * 0x10000 + colorComponent255(this.g) * 0x100 + colorComponent255(this.b);
    };
    
    // Returns the color as integer in RGB byte order.
    public toRGBInteger(): number {
        return colorComponent255(this.r) * 0x10000 + colorComponent255(this.g) * 0x100 + colorComponent255(this.b);
    };
    
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
    
    public toHSL(): {h: number, s: number, l: number} {
        const color = this.toHSV();
        const l = color.v - color.v * color.s / 2;
        const m = Math.min(l, 1 - l);
        const sl = m ? (color.v - l) / m : 0;
        return {h: color.h, s: sl, l};
    }
    
    // Returns an integer in ARGB byte order.
    public toJson(): ColorJSON {
        return {r: this.r, g: this.g, b: this.b, a: this.a};
    };
    
    // Return a color with all components clamped to [0, 1].
    public clamped(): Color {
        return new Color(clamped(this.r), clamped(this.g), clamped(this.b), clamped(this.a));
        
    };
    
    // Adds a color.
    public plus(color: Color): Color {
        return new Color(this.r + color.r, this.g + color.g, this.b + color.b, this.a + color.a);
    };
    
    // Subtracts a color.
    public minus(color: Color): Color {
        return new Color(this.r - color.r, this.g - color.g, this.b - color.b, this.a - color.a);
    };
    
    // Multiplies all color components with a factor.
    public times(factor: number): Color {
        return new Color(this.r * factor, this.g * factor, this.b * factor, this.a * factor);
    };
    
    // Mixes two colors. This can also be used to darken (mix with black) or lighten (mix with white) colors.
    public mixed(color: Color, ratio: number): Color {
        const invRatio = 1 - ratio;
        return new Color(this.r * invRatio + color.r * ratio, this.g * invRatio + color.g * ratio, this.b * invRatio + color.b * ratio, this.a * invRatio + color.a * ratio);
    };
    
    // Returns a transparent color.
    public transparent(): Color {
        return new Color(this.r, this.g, this.b, 0);
    };
    
    // Returns an opaque color.
    public opaque(opacity = 1): Color {
        return new Color(this.r, this.g, this.b, opacity);
    };
    
    // Calculates the distance between two colors.
    public distanceToColor(color: Color): number {
        return Math.sqrt(this.distanceToColorSquared(color));
    };
    
    // Calculates the squared distance between two colors.
    public distanceToColorSquared(color: Color): number {
        const dr = this.r - color.r;
        const dg = this.g - color.g;
        const db = this.b - color.b;
        const da = this.a - color.a;
        return dr * dr + dg * dg + db * db + da * da;
    };
    
    // Returns true if the two colors are equal.
    public equals(color: Color): boolean {
        return this.distanceToColor(color) < 0.001;
    };
    
    
    // Create a color from a JSON object.
    public static fromJson(json: ColorJSON | null): Color | null {
        if (!json) {
            return null;
        }
        return new Color(json.r, json.g, json.b, json.a);
    };
    
    // Creates a color. All parameters must be values between 0 and 1.
    public static rgba1(r: number, g: number, b: number, a: number): Color {
        return new Color(r, g, b, a);
    };
    
    // Creates a color. All parameters must be values between 0 and 255.
    public static rgba255(r: number, g: number, b: number, a: number): Color {
        return new Color(r / 255, g / 255, b / 255, a / 255);
    };
    
    // Creates a color. The parameters r, g, and b must be values between 0 and 255, and a must be a value between 0 (transparent) and 1 (opaque). This corresponds to the CSS notation.
    public static rgba(r: number, g: number, b: number, a: number): Color {
        return new Color(r / 255, g / 255, b / 255, a);
    };
    
    // Creates a color. The parameters r, g, and b must be values between 0 and 255. The opacity is set to 1.
    public static rgb(r: number, g: number, b: number): Color {
        return new Color(r / 255, g / 255, b / 255, 1);
    };
    
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
    
    // Converts a 4-byte ARGB integer to a color.
    public static fromARGBInteger(value: number): Color {
        const a = (value >> 24) & 0xff;
        const r = (value >> 16) & 0xff;
        const g = (value >> 8) & 0xff;
        const b = value & 0xff;
        return new Color(r / 255, g / 255, b / 255, a / 255);
    };
    
    // Converts a 3-byte RGB integer to a color.
    public static fromRGBInteger(value: number): Color {
        const r = (value >> 16) & 0xff;
        const g = (value >> 8) & 0xff;
        const b = value & 0xff;
        return new Color(r / 255, g / 255, b / 255, 1);
    };
    
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
    
    public static black            = new Color(0, 0, 0, 1);
    public static white            = new Color(1, 1, 1, 1);
    public static transparentBlack = new Color(0, 0, 0, 0);
    public static transparentWhite = new Color(1, 1, 1, 0);
}

function colorComponent255(value: number): number {
    return bounded(Math.floor(value * 255), 0, 255);
}

interface XY {
    x: number,
    y: number
}

interface XYZ {
    x: number,
    y: number,
    z: number
}

interface XYY {
    x: number,
    y: number,
    Y: number
}


function lineDistance(pointA: XY, pointB: XY): number {
    return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
}

function closestPoint(xyPoint: XY, pointA: XY, pointB: XY): XY {
    const xy2a         = subXY(xyPoint, pointA);
    const a2b          = subXY(pointB, pointA);
    const a2bSqr       = Math.pow(a2b.x, 2) + Math.pow(a2b.y, 2);
    const xy2a_dot_a2b = xy2a.x * a2b.x + xy2a.y * a2b.y;
    const t            = xy2a_dot_a2b / a2bSqr;
    return xy(pointA.x + a2b.x * t, pointA.y + a2b.y * t);
}

export class Gamut {
    
    public red: XY;
    public green: XY;
    public blue: XY;
    
    constructor(rx: number, ry: number, gx: number, gy: number, bx: number, by: number) {
        this.red   = xy(rx, ry);
        this.green = xy(gx, gy);
        this.blue  = xy(bx, by);
    }
    
    // Returns if an xy point is inside the gamut.
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
    
    // Returns the closest xy point inside the gamut.
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
    
    public static none = new Gamut(1, 0, 0, 1, 0, 0);
    
}

function xy(x: number, y: number): XY {
    return {x, y};
}

function subXY(a: XY, b: XY): XY {
    return xy(a.x - b.x, a.y - b.y);
}

class Vector3 {
    
    
    constructor(public x: number, public y: number, public z: number) {
    }
    
    public toString(): string {
        return "vector3(" + this.x.toPrecision(6) + ", " + this.y.toPrecision(6) + ", " + this.z.toPrecision(6) + ")";
    };
    
    // Returns the length of the vector.
    public length(): number {
        return distance3(this.x, this.y, this.z);
    };
    
    // Returns the squared length of the vector.
    public lengthSquared(): number {
        return distanceSquared3(this.x, this.y, this.z);
    };
    
    // Creates a unit vector pointing in the same direction.
    public unit(): Vector3 {
        const d = this.length();
        return new Vector3(this.x / d, this.y / d, this.z / d);
    };
    
    // Adds two vectors.
    public plus(v: Vector3): Vector3 {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    };
    
    // Subtracts two vectors.
    public minus(v: Vector3): Vector3 {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    };
    
    // Multiplies a vector by a scalar value.
    public timesScalar(value: number): Vector3 {
        return new Vector3(this.x * value, this.y * value, this.z * value);
    };
    
    // Multiplies a vector by -1.
    public reversed(): Vector3 {
        return new Vector3(-this.x, -this.y, -this.z);
    };
    
    // Calculates the dot product of two vectors.
    public dot(v: Vector3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    };
    
    // Calculates the cross product of two vectors.
    public cross(v: Vector3): Vector3 {
        return new Vector3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x);
    };
    
    // Returns if the two vectors are equal.
    public equals(v: Vector3): boolean {
        return this.x == v.x && this.y == v.y && this.z == v.z;
    };
    
    // Returns an array with [x, y, z].
    public toArray(): number[] {
        return [this.x, this.y, this.z];
    };
    
    // Returns an Float32Array with [x, y, z] suitable for use in WebGl.
    public toGlArray(): Float32Array {
        return new Float32Array([this.x, this.y, this.z]);
    };
    
    // Returns an array with [x, y, z, 1], which is used for affine transformations using a 4x4 matrix.
    public toArray4(): number[] {
        return [this.x, this.y, this.z, 1];
    };
    
    
    // Creates a vector from an array with 3 numbers [x, y, z].
    public static fromArray(array: number[]): Vector3 | null {
        if (!Array.isArray(array)) {
            return null;
        }
        return new Vector3(array[0] ?? 0, array[1] ?? 0, array[2] ?? 0);
    };
    
}


function distance3(dx: number, dy: number, dz: number): number {
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distanceSquared3(dx: number, dy: number, dz: number): number {
    return dx * dx + dy * dy + dz * dz;
}

export class Matrix3 {
    constructor(public elements: number[]) {
    }
    
    public static createIdentity(): Matrix3 {
        return new Matrix3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    }
    
    public static createWithColumnVectors(c1: Vector3, c2: Vector3, c3: Vector3): Matrix3 {
        return new Matrix3([
                               c1.x, c2.x, c3.x,
                               c1.y, c2.y, c3.y,
                               c1.z, c2.z, c3.z
                           ]);
    };
    
    public static createWithColumnVectors2(c1: Vector3, c2: Vector3): Matrix3 {
        return new Matrix3([
                               c1.x, c2.x, 0,
                               c1.y, c2.y, 0,
                               0, 0, 1
                           ]);
    };
    
    public static createTranslation(vector: Vector3): Matrix3 {
        return new Matrix3([
                               1, 0, vector.x,
                               0, 1, vector.y,
                               0, 0, 1
                           ]);
    };
    
    public static createScaling(vector: Vector3): Matrix3 {
        return new Matrix3([
                               vector.x, 0, 0,
                               0, vector.y, 0,
                               0, 0, 1
                           ]);
    };
    
    public static createRotation(angle: number): Matrix3 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Matrix3([
                               c, -s, 0,
                               s, c, 0,
                               0, 0, 1
                           ]);
    };
    
    public e(x: number, y: number): number {
        return this.elements[y * 3 + x] ?? 0;
    };
    
    public row(y: number): number[] {
        return this.elements.slice(y * 3, y * 3 + 3);
    };
    
    public rowVector(y: number): Vector3 {
        return new Vector3(this.elements[y * 3] ?? 0, this.elements[y * 3 + 1] ?? 0, this.elements[y * 3 + 2] ?? 0);
    };
    
    public column(x: number): number[] {
        return [this.elements[x] ?? 0, this.elements[3 + x] ?? 0, this.elements[6 + x] ?? 0];
    };
    
    public columnVector(x: number): Vector3 {
        return new Vector3(this.elements[x] ?? 0, this.elements[3 + x] ?? 0, this.elements[6 + x] ?? 0);
    };
    
    public diagonal(): number [] {
        return [this.elements[0] ?? 0, this.elements[4] ?? 0, this.elements[8] ?? 0];
    };
    
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
    
    public clone(): Matrix3 {
        return new Matrix3(this.elements.slice());
    };
    
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
    
    public timesVector(vector: Vector3): Vector3 {
        const elements = this.elements;
        
        const component = (i: number): number => {
            return (elements[i * 3] ?? 0) * vector.x +
                   (elements[i * 3 + 1] ?? 0) * vector.y +
                   (elements[i * 3 + 2] ?? 0) * vector.z;
        };
        
        return new Vector3(component(0), component(1), component(2));
        
    };
    
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
    
    public vectorTimes(vector: Vector3): Vector3 {
        const elements  = this.elements;
        const component = (i: number): number => {
            return vector.x * (elements[i] ?? 0) +
                   vector.y * (elements[3 + i] ?? 0) +
                   vector.z * (elements[6 + i] ?? 0);
        };
        return new Vector3(component(0), component(1), component(2));
        
    };
    
    public transposed(): Matrix3 {
        const result = new Array<number>(9);
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                result[y * 3 + x] = this.elements[x * 3 + y] ?? 0;
            }
        }
        return new Matrix3(result);
    };
    
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
    
    public rotated(angle: number): Matrix3 {
        return Matrix3.createRotation(angle).times(this);
    };
    
    public translated(vector: Vector3): Matrix3 {
        return Matrix3.createTranslation(vector).times(this);
    };
    
    public scaled(vector: Vector3): Matrix3 {
        return Matrix3.createScaling(vector).times(this);
    };
    
    
}


// Gamma correction.
export class GammaCorrection {
    
    public gammaInv: number;
    public transitionInv: number;
    public slopeInv: number;
    
    constructor(public gamma: number, public transition: number, public slope: number, public offset: number) {
        this.gammaInv      = 1 / gamma;
        this.transitionInv = this.transform(transition);
        this.slopeInv      = 1 / slope;
        
    }
    
    public transform(value: number): number {
        return value <= this.transition ? this.slope * value : (1 + this.offset) * Math.pow(value, this.gamma) - this.offset;
    };
    
    public invTransform(value: number): number {
        return value <= this.transitionInv ? value * this.slopeInv : Math.pow((value + this.offset) / (1 + this.offset), this.gammaInv);
    };
    
}

// No gamma correction.
export class NoGammaCorrection extends GammaCorrection {
    
    constructor() {super(0, 0, 0, 0);}
    
    public override transform(value: number): number { return value; };
    
    public override invTransform(value: number): number { return value; };
    
}

// A color space. The matrix is a Matrix3 to transform (gamma-corrected) RGB values to XYZ coordinates.
export class ColorSpace {
    
    public matrixInv: Matrix3 | null;
    
    constructor(public matrix: Matrix3, public gammaCorrection: GammaCorrection) {
        this.matrixInv = matrix.inversed();
    }
    
    // Transforms a color to XYZ coordinates. The alpha component is ignored.
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
    
    // Transforms a color to xyY coordinates.
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
    
    // Transforms XYZ coordinates to a color.
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
    
    // Transforms xyY coordinates to a color.
    public colorFromXYY(x: number, y: number, Y: number, clamp: boolean = true): Color {
        if (y == 0) {
            y = 1e-12;
        }
        const z = 1.0 - x - y;
        return this.colorFromXYZ((Y / y) * x, Y, (Y / y) * z, clamp);
    };
    
    // Transforms xy coordinates to a color with maximum intensity
    public colorFromXY(x: number, y: number, clamp: boolean = true): Color {
        return this.colorFromXYY(x, y, this.findMaximumY(x, y), clamp);
    };
    
    public findMaximumY(x: number, y: number, iterations = 10): number {
        let bri = 1;
        for (let i = 0; i < iterations; i++) {
            const color = this.colorFromXYY(x, y, bri);
            const max   = Math.max(color.r, color.g, color.b);
            bri         = bri / max;
        }
        
        return bri;
    };
    
    public static sRGB = new ColorSpace(new Matrix3([
                                                        0.412453, 0.35758, 0.180423,
                                                        0.212671, 0.71516, 0.072169,
                                                        0.019334, 0.119193, 0.950227
                                                    ]), new GammaCorrection(0.42, 0.0031308, 12.92, 0.055));
    
    public static wide = new ColorSpace(new Matrix3([
                                                        0.7164, 0.1010, 0.1468,
                                                        0.2587, 0.7247, 0.0166,
                                                        0.0000, 0.0512, 0.7740
                                                    ]), new NoGammaCorrection());
    
    public static adobeRGB = new ColorSpace(new Matrix3([
                                                            0.5767, 0.1856, 0.1882,
                                                            0.2974, 0.6273, 0.0753,
                                                            0.0270, 0.0707, 0.9911
                                                        ]), new NoGammaCorrection());
}

