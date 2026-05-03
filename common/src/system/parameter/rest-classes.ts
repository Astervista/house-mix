/**
 * This module contains support classes used for communication with the REST backend regarding {@link SystemParameter|`SystemParameter`s}.
 *
 * @module
 */
import {Allow} from "rest-decorators";

// noinspection ES6UnusedImports
import type {SystemParameter} from "./system-parameter";

/**
 * The body for the REST PATCH call to change a value to a parameter.
 */
export class SetParameterBody {
    /**
     * The new value to assign to the parameter.
     *
     * @see {@link SystemParameter#value|`SystemParameter.value`}.
     */
    @Allow()
    public value?: unknown;
}
