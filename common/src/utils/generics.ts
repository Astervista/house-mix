export function mapToRecord<K extends string | number, V>(map: Map<K, V>): Record<string, V> {
    return Object.fromEntries([...map.entries()].map(([key, val]) => [typeof key == "number" ? key.toString() : key, val]));
}

export function recordFromEntries<K extends string | number, V>(entries: [K, V][]): Record<string, V> {
    return Object.fromEntries(entries);
}
