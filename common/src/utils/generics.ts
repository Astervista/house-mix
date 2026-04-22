/**
 * This module describes some functions to handle {@link Map|`Map`s} and {@link Record|`Record`s}.
 *
 * @module
 */
/**
 * Converts a {@link Map|`Map`s} to a plain {@link Record|`Record`} object.
 * Handles numeric keys by converting them to strings to satisfy Record constraints.
 *
 * @template K - The key type.
 * @template V - The value type.
 * @param {Map<K, V>} map - The Map to convert.
 * @returns {Record<string, V>} A Record containing the same key-value pairs.
 */
export function mapToRecord<K extends string | number, V>(map: Map<K, V>): Record<string, V> {
    return Object.fromEntries([...map.entries()].map(([key, val]) => [typeof key == "number" ? key.toString() : key, val]));
}

/**
 * Creates a {@link Record|`Record`} from an array of key-value entry pairs.
 *
 * @template K - The key type.
 * @template V - The value type.
 * @param {[K, V][]} entries - An array of [key, value] tuples.
 * @returns {Record<string, V>} A Record object constructed from the entries.
 */
export function recordFromEntries<K extends string | number, V>(entries: [K, V][]): Record<string, V> {
    return Object.fromEntries(entries);
}
