// Disabled the rule because it is not null but may be removed in the future, also it's
// safer to check for navigator.platform first and at least try, then fallback to userAgent
// eslint-disable-next-line @typescript-eslint/no-deprecated, @typescript-eslint/no-unnecessary-condition
const whatModifier = /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent) ? 'CMD' : 'CTRL';

export function patchKeyboardEvent(event: KeyboardEvent): KeyboardEvent & KeyboardEventPatch {
    const patchedEvent: KeyboardEvent & KeyboardEventPatch = event as KeyboardEvent & KeyboardEventPatch;
    patchOsModifier(patchedEvent);
    return patchedEvent;
}

export function patchMouseEvent(event: MouseEvent): MouseEvent & MouseEventPatch {
    const patchedEvent: MouseEvent & KeyboardEventPatch = event as MouseEvent & KeyboardEventPatch;
    patchOsModifier(patchedEvent);
    return patchedEvent;
}

function patchOsModifier(event: MouseEvent & MouseEventPatch | KeyboardEvent & KeyboardEventPatch): void {
    if (whatModifier === 'CMD') {
        event.osModifier = event.metaKey;
    } else {
        event.osModifier = event.ctrlKey;
    }
}

export interface KeyboardEventPatch {
    /**
     * A boolean variable that indicates whether the primary modifier key is pressed. The primary modifier key is OS-dependent, and the correct one is chosen given the os.
     * So, on a Windows/Linux machine, this value is true if the Ctrl button is pressed, while on an Apple machine it is true if the Command button is pressed.
     */
    osModifier: boolean;
}

export interface MouseEventPatch {
    osModifier: boolean;
}
