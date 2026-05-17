/**
 * This module contains useful enumerations for the whole frontend.
 *
 * @module
 */

/**
 * The loading status of some resource.
 */
export enum LoadingStatus {
    /** The resource is currently being loaded. */
    LOADING = "LOADING",
    /** The resource has been loaded successfully and is now ready. */
    LOADED = "LOADED",
    /** The resource loading has endeed and resulted in an error. */
    ERROR = "ERROR"
}
