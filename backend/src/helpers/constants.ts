/**
 * This module contains helper functions, constants, classes and type definitions useful in the application.
 *
 * @module
 */

/**
 * An object that can be serialized for storage or networking operations.
 *
 * @template J - The serialized class or interface.
 */
export interface Serializable<J> {
    /**
     * Converts the serializable instance into its JSON representation.
     *
     * @returns {J} The JSON representation of `this`.
     */
    toJSON(): J;
}
