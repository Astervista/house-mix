/**
 * This module contains helper functions for handling keyboards and keyboard events.
 *
 * @module
 */
/**
 * The correct modifier for the OS this application is running in.
 */
    // Disabled the rule because it is not null but may be removed in the future, also it's
// safer to check for navigator.platform first and at least try, then fallback to userAgent
// eslint-disable-next-line @typescript-eslint/no-deprecated, @typescript-eslint/no-unnecessary-condition
const whatModifier: "CMD" | "CTRL" = /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent) ? 'CMD' : 'CTRL';

/**
 * Patch a {@link KeyboardEvent|`KeyboardEvent`} by adding a {@link KeyboardEventPatch#osModifier|`osModifier`} property, containing the
 * value of the correct main modifier for the system this application is running in.
 * If the system is an Apple system, the `osModifier` property will contain the value of {@link KeyboardEvent#metaKey|`metaKey`},
 * while if the system is any other the property will contain the value of {@link KeyboardEvent#ctrlKey|`ctrlKey`}.
 *
 * @param {KeyboardEvent} event - The event to patch.
 * @returns {KeyboardEvent & KeyboardEventPatch} - The patched event.
 */
export function patchKeyboardEvent(event: KeyboardEvent): KeyboardEvent & KeyboardEventPatch {
    const patchedEvent: KeyboardEvent & KeyboardEventPatch = event as KeyboardEvent & KeyboardEventPatch;
    patchOsModifier(patchedEvent);
    return patchedEvent;
}

/**
 * Patch a {@link MouseEvent|`MouseEvent`} by adding a {@link MouseEventPatch#osModifier|`osModifier`} property, containing the
 * value of the correct main modifier for the system this application is running in.
 * If the system is an Apple system, the `osModifier` property will contain the value of {@link MouseEvent#metaKey|`metaKey`},
 * while if the system is any other the property will contain the value of {@link MouseEvent#ctrlKey|`ctrlKey`}.
 *
 * @param {MouseEvent} event - The event to patch.
 * @returns {MouseEvent & MouseEventPatch} - The patched event.
 */
export function patchMouseEvent(event: MouseEvent): MouseEvent & MouseEventPatch {
    const patchedEvent: MouseEvent & KeyboardEventPatch = event as MouseEvent & KeyboardEventPatch;
    patchOsModifier(patchedEvent);
    return patchedEvent;
}

/**
 * Patch a {@link MouseEvent|`MouseEvent`} or {@link KeyboardEvent|`KeyboardEvent`}.
 *
 * @param {(MouseEvent & MouseEventPatch) | (KeyboardEvent & KeyboardEventPatch)} event - The event to patch.
 */
function patchOsModifier(event: MouseEvent & MouseEventPatch | KeyboardEvent & KeyboardEventPatch): void {
    if (whatModifier === 'CMD') {
        event.osModifier = event.metaKey;
    } else {
        event.osModifier = event.ctrlKey;
    }
}

/**
 * A patch to a keyboard event.
 */
export interface KeyboardEventPatch {
    /**
     * A boolean variable that indicates whether the primary modifier key is pressed. The primary modifier key is OS-dependent, and the correct one is chosen given the os.
     * So, on a Windows/Linux machine, this value is true if the Ctrl button is pressed, while on an Apple machine it is true if the Command button is pressed.
     */
    osModifier: boolean;
}

/**
 * A patch to a mouse event.
 */
export interface MouseEventPatch {
    /**
     * A boolean variable that indicates whether the primary modifier key is pressed. The primary modifier key is OS-dependent, and the correct one is chosen given the os.
     * So, on a Windows/Linux machine, this value is true if the Ctrl button is pressed, while on an Apple machine it is true if the Command button is pressed.
     */
    osModifier: boolean;
}
