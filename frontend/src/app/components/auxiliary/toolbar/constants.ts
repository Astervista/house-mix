/**
 * This module contains constatns related to toolbars and shortcuts.
 *
 * @module
 */


/** Map with special characters for displaying a KeyboardEvent's key in Apple devices. */
const KEY_DISPLAY_MAC: Record<string, string> = {
    'Delete': '⌦',
    'Enter':  '⏎',
    'Escape': '⎋'
};
/** Map with special characters for displaying a KeyboardEvent's key in Linux and Windows devices. */
const KEY_DISPLAY_OTHER: Record<string, string> = {
    'Delete': 'Del',
    'Enter':  '⏎',
    'Escape': 'Esc'
};

for (let i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
    KEY_DISPLAY_OTHER['Key' + String.fromCharCode(i)] = String.fromCharCode(i);
    KEY_DISPLAY_MAC['Key' + String.fromCharCode(i)]   = String.fromCharCode(i);
}

/** Map with special characters for displaying a KeyboardEvent's key in the current system. */
export
/** Map with special characters for displaying a KeyboardEvent's key in the current system. */
// Disabled the rule because it is not null but may be removed in the future, also it's
// safer to check for navigator.platform first and at least try, then fallback to userAgent
// eslint-disable-next-line @typescript-eslint/no-deprecated, @typescript-eslint/no-unnecessary-condition
const KEY_DISPLAY = (!/Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent)) ? KEY_DISPLAY_MAC : KEY_DISPLAY_OTHER;

/**
 * Modifier to be used in shortcuts.
 */
export enum Modifier {
    /** The os-specific modifier, CMD in Apple systems, Ctrl in all the others. */
    OS    = 'OS',
    /** The shift key. */
    SHIFT = 'SHIFT',
    /** The alternative key. */
    ALT   = 'ALT'
}

/** The display string for {@link Modifier|`Modifier`s} in Apple devices. */
const MODIFIER_DISPLAY_MAC = {
    [Modifier.OS]:    '⌘',
    [Modifier.SHIFT]: '⇧',
    [Modifier.ALT]:   '⌥'
};

/** The display string for {@link Modifier|`Modifier`s} in Linux and Windows devices. */
const MODIFIER_DISPLAY_OTHER = {
    [Modifier.OS]:    'Ctrl + ',
    [Modifier.SHIFT]: 'Shift + ',
    [Modifier.ALT]:   'Alt + '
};

/** The display string for {@link Modifier|`Modifier`s} in the current system. */
export
/** The display string for {@link Modifier|`Modifier`s} in the current system. */
// Disabled the rule because it is not null but may be removed in the future, also it's
// safer to check for navigator.platform first and at least try, then fallback to userAgent
// eslint-disable-next-line @typescript-eslint/no-deprecated, @typescript-eslint/no-unnecessary-condition
const MODIFIER_DISPLAY = (!/Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent)) ? MODIFIER_DISPLAY_MAC : MODIFIER_DISPLAY_OTHER;
