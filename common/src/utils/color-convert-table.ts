/**
 * This module contains facility functions to transform color temperature to color.
 *
 * @module
 */
import {Color, ColorSpace} from "./color-convert";
import {MAX_ALLOWED_TEMP, MIN_ALLOWED_TEMP} from "./constants";

/**
 * Lookup table for the transformation. Each element is a color temperature in Kelvin and the x, y coordinates in the CIE 1931 XY color space.
 * Points are spaced such that the intermediate values can be approximated using linear interpolation.
 */
const xyKelvinTable: [number, number, number][] = [
    [1000, 0.6527500558, 0.3444622272],
    [1190, 0.626401838, 0.3664110461],
    [1490, 0.5869832153, 0.3924429143],
    [1790, 0.550410486, 0.4078754678],
    [2090, 0.5170107246, 0.4145044507],
    [2440, 0.482435624, 0.4143201026],
    [2790, 0.4526393008, 0.4088373329],
    [3140, 0.4272939721, 0.4005316639],
    [3490, 0.4058630394, 0.3909950492],
    [3840, 0.3877591576, 0.3811748106],
    [4190, 0.3724313423, 0.3715989526],
    [4640, 0.356040385, 0.3600646869],
    [5240, 0.3386915311, 0.3463639473],
    [5940, 0.323220805, 0.3328019896],
    [6790, 0.309226097, 0.3193861041],
    [7990, 0.2952815234, 0.30486707],
    [9990, 0.2806880587, 0.2883513684],
    [13190, 0.2680396612, 0.2728556012],
    [20000, 0.2564564394, 0.2576285522]
];

/**
 * Converts a color temperature in Kelvin to CIE 1931 XY coordinates.
 *
 * @param {number} temp - The temperature in Kelvin.
 * @returns {{x: number, y: number}} An object containing the x and y coordinates.
 */
export function kelvinToXY(temp: number): { x: number, y: number } {
    temp = Math.min(MAX_ALLOWED_TEMP, Math.max(MIN_ALLOWED_TEMP, temp));
    for (let i = 0; i < xyKelvinTable.length - 1; i++) {
        if (temp >= (xyKelvinTable[i]?.[0] ?? 0) && (temp < (xyKelvinTable[i + 1]?.[0] ?? 0) || i == xyKelvinTable.length - 2)) {
            const xyKelvinTableElement     = xyKelvinTable[i];
            const xyKelvinTableElementNext = xyKelvinTable[i + 1];
            if (!xyKelvinTableElement || !xyKelvinTableElementNext) {
                return {
                    x: 0.323220805,
                    y: 0.3328019896
                };
            } else {
                const t = (temp - xyKelvinTableElement[0]) / (xyKelvinTableElementNext[0] - xyKelvinTableElement[0]);
                return {
                    x: t * (xyKelvinTableElementNext[1] - xyKelvinTableElement[1]) + xyKelvinTableElement[1],
                    y: t * (xyKelvinTableElementNext[2] - xyKelvinTableElement[2]) + xyKelvinTableElement[2]
                };
            }
        }
    }
    return {
        x: 0.323220805,
        y: 0.3328019896
    };
    
}

/**
 * Converts a color temperature in Kelvin to a Color object in the sRGB color space.
 *
 * @param {number} temp - The temperature in Kelvin.
 * @returns {Color} A Color object representing the temperature.
 */
export function kelvinToColor(temp: number): Color {
    const xy = kelvinToXY(temp);
    return ColorSpace.sRGB.colorFromXYY(xy.x, xy.y, 0.75);
}
