/**
 * This module contains general use constants.
 *
 * @module
 */

// Double jsDoc for all constants because linter doesn't like for it to be before "export", but TypeDoc doesn't notice it if after "export".

/**
 * A regular expression pattern used to validate unique names.
 *
 * The pattern allows:
 * - Lowercase alphabetic characters (`a-z`)
 * - Numeric digits (`0-9`)
 * - Hyphen (`-`)
 * - Underscore (`_`).
 *
 * This pattern ensures that the name is composed of only permitted characters
 * and does not include spaces, uppercase letters or special symbols.
 */
export
/**
 * A regular expression pattern used to validate unique names.
 *
 * The pattern allows:
 * - Lowercase alphabetic characters (`a-z`)
 * - Numeric digits (`0-9`)
 * - Hyphen (`-`)
 * - Underscore (`_`).
 *
 * This pattern ensures that the name is composed of only permitted characters
 * and does not include spaces, uppercase letters or special symbols.
 */
const UNIQUE_NAME_PATTERN = /^[a-z\-0-9_]+$/;

/**
 * The maximum allowed color temp.
 */
export
/**
 * The maximum allowed color temp.
 */
const MAX_ALLOWED_TEMP = 10000;

/**
 * The minimum allowed color temp.
 */
export
/**
 * The minimum allowed color temp.
 */
const MIN_ALLOWED_TEMP = 2000;

/**
 * The default color temp.
 */
export
/**
 * The default color temp.
 */
const DEFAULT_TEMP = 4000;
