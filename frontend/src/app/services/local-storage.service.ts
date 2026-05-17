/**
 * This module includes the {@link LocalStorageService|`LocalStorageService`} class and helper classes.
 *
 * @module
 */
import {Injectable} from '@angular/core';

/**
 * A service that helps saving and retrieving data from the local storage, handling retrieval, key
 * management, serialization and typing.
 *
 * This class provides a function for saving a value {{@link LocalStorageService#setItem| `setItem()`}},
 * one for retrieving it ({@link LocalStorageService#getItem| `getItem()`} and one for clearing it
 * ({@link LocalStorageService#removeItem| `removeItem()`}. All of them make use of {@link LocalStorageObject|`LocalStorageObject`}
 * as a means to identify different pieces of data being handled and default values.
 *
 * @service
 */
@Injectable({
                providedIn: 'root'
            })
export class LocalStorageService {

    /**
     * Save a value to the local storage at a specific key.
     *
     * @param {LocalStorageObject<T>} key - The key of the object, containing the name under which to save the value. Data with the same
     *                                      {@link LocalStorageObject|`name`} will be overwritten.
     * @param {T} value - The value to save.
     * @param {(value: T) => unknown} serializer - The serializer function to transform `value` into a serializable value
     *                                             that then gets serialized with {@link JSON#stringify| `JSON.stringify()`} and saved.
     *                                             If omitted, `value` is saved as is.
     * @template T - The type of the value to save. Must match with the key.
     */
    public setItem<T>(key: LocalStorageObject<T>, value: T, serializer: (value: T) => unknown = t => t): void {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const jsonValue = JSON.stringify(serializer(value));
            localStorage.setItem(key.name, jsonValue);
        } catch (error) {
            console.error('Error saving to local storage', error);
        }
    }

    /**
     * Retrieve a value from the local storage at a specific key.
     *
     * @param {LocalStorageObject<T>} key - The key of the object, containing the name under which the value is saved.
     * @param {(value: T) => unknown} deserializer - The deserializer function to transform the value coming from the
     *                                               local storage and deserialized with {@link JSON#parse| `JSON.parse()`} into
     *                                               the correct value of type T. If omitted, the result is returned as is.
     * @returns {T} The saved value, or {@link LocalStorageObject|`defaultValue`} if no saved value was found.
     * @template T - The type of the value to retrieve. Must match with the key.
     */
    public getItem<T>(key: LocalStorageObject<T>, deserializer: (value: unknown) => T = t => t as T): T {
        if (typeof window === 'undefined') {
            return key.defaultValue;
        }
        try {
            const value = localStorage.getItem(key.name);
            return (value != null) ? deserializer(JSON.parse(value)) : key.defaultValue;
        } catch (error) {
            console.error('Error reading from local storage', error);
            return key.defaultValue;
        }
    }

    /**
     * Clear a value saved in the local storage at a specific key.
     *
     * @param {LocalStorageObject<unknown>} key - The key of the object, containing the name under which the value is saved.
     */
    public removeItem(key: LocalStorageObject<unknown>): void {
        if (typeof window === 'undefined') {
            return;
        }
        localStorage.removeItem(key.name);
    }

    /** Clear all saved data. */
    public clear(): void {
        if (typeof window === 'undefined') {
            return;
        }
        localStorage.clear();
    }
}

/**
 * A value to identify a location in which a specific value is saved with {@link LocalStorageService|`LocalStorageService`}.
 *
 * @template T - The type of the value.
 */
export class LocalStorageObject<T> {

    /**
     * Create an instance of the class.
     *
     * @param {string} name - The unique name under which the value is saved.
     * @param {T} defaultValue - The default value that gets returned if no value has yet been saved with this name.
     */
    constructor(
        public readonly name: string,
        public readonly defaultValue: T
    ) {
    }

}
