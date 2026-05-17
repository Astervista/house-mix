/**
 * This module contains useful constants for the whole frontend.
 *
 * @module
 */
import {DatumType} from '@common/mixing/mix/datum';
import {isDevMode} from '@angular/core';

// noinspection ES6UnusedImports
import type {HttpRequestDecorator} from './networking/decorators';
// noinspection ES6UnusedImports
import type {MatTooltip} from '@angular/material/tooltip';
// noinspection ES6UnusedImports
import type {MatSnackBar} from '@angular/material/snack-bar';
// noinspection ES6UnusedImports
import type {Device} from '@common/devices/device';
// noinspection ES6UnusedImports
import type {Group} from '@common/devices/group/group';
// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';

/**
 * The base path for all calls performed by an {@link HttpRequestDecorator|`HttpRequestDecorator`}.
 *
 * @type {string}
 */
export
/**
 * The base path for all calls performed by an {@link HttpRequestDecorator|`HttpRequestDecorator`}.
 *
 * @type {string}
 */
const API_ENDPOINT: string  = isDevMode() ? 'http://localhost:3001/' : '/house-mix/api/';
/**
 * The base path for all resources.
 *
 * @type {string}
 */
export
/**
 * The base path for all resources.
 *
 * @type {string}
 */
const RESOURCE_ROOT: string = isDevMode() ? '/' : '/house-mix/';

/**
 * The standard timeout for a {@link MatSnackBar|`MatSnackbar`}.
 *
 * @type {number}
 */
export
/**
 * The standard timeout for a {@link MatSnackBar|`MatSnackbar`}.
 *
 * @type {number}
 */
const SNACKBAR_TIMEOUT = 5000;
/**
 * The standard timeout for a {@link MatTooltip|`MatTooltip`}.
 *
 * @type {number}
 */
export
/**
 * The standard timeout for a {@link MatTooltip|`MatTooltip`}.
 *
 * @type {number}
 */
const TOOLTIP_TIMEOUT = 1000;

/**
 * A function that returns the correct format to print a {@link Date|`Date`} given a specific
 * {@link DatumType|`DatumType`}.
 *
 * @param {DatumType} type - The type of the value  to format.
 * @returns {string} The format string. N.B.: This is not a formatted date, it's just the format, e.g., `"yyyy-MM-dd"`.
 */
export function getDateDisplayFormat(type: DatumType): string {
    return type == DatumType.DATE ? "yyyy-MM-dd" : (type == DatumType.TIME ? "HH:mm:ss" : "yyyy-MM-dd HH:mm:ss")
}

/**
 * All the pages in the main screen of the application.
 */
export enum MainPages {
    /** The page that shows {@link Device|`Device`s} and their {@link Group|`Group`s} structure. */
    DEVICES = 'DEVICES',
    /** The page that shows {@link Mix|`Mix`es} and their dependencies. */
    MIXING  = 'MIXING',
    /** The page that shows system configuration and customization. */
    SYSTEM  = 'SYSTEM'
}
