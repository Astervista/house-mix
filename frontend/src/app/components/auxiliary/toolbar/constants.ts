const KEY_DISPLAY_MAC: Record<string, string> = {
    'Delete': '⌦',
    'Enter':  '⏎',
    'Escape': '⎋'
};

const KEY_DISPLAY_OTHER: Record<string, string> = {
    'Delete': 'Del',
    'Enter':  '⏎',
    'Escape': 'Esc'
};

for (let i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
    KEY_DISPLAY_OTHER['Key' + String.fromCharCode(i)] = String.fromCharCode(i);
    KEY_DISPLAY_MAC['Key' + String.fromCharCode(i)]   = String.fromCharCode(i);
}

// Disabled the rule because it is not null but may be removed in the future, also it's
// safer to check for navigator.platform first and at least try, then fallback to userAgent
// eslint-disable-next-line @typescript-eslint/no-deprecated, @typescript-eslint/no-unnecessary-condition
export const KEY_DISPLAY = (!/Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent)) ? KEY_DISPLAY_MAC : KEY_DISPLAY_OTHER;

export enum Modifier {
    OS    = 'OS',
    SHIFT = 'SHIFT',
    ALT   = 'ALT'
}

const MODIFIER_DISPLAY_MAC = {
    [Modifier.OS]:    '⌘',
    [Modifier.SHIFT]: '⇧',
    [Modifier.ALT]:   '⌥'
};

const MODIFIER_DISPLAY_OTHER = {
    [Modifier.OS]:    'Ctrl + ',
    [Modifier.SHIFT]: 'Shift + ',
    [Modifier.ALT]:   'Alt + '
};

// Disabled the rule because it is not null but may be removed in the future, also it's
// safer to check for navigator.platform first and at least try, then fallback to userAgent
// eslint-disable-next-line @typescript-eslint/no-deprecated, @typescript-eslint/no-unnecessary-condition
export const MODIFIER_DISPLAY = (!/Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent)) ? MODIFIER_DISPLAY_MAC : MODIFIER_DISPLAY_OTHER;
