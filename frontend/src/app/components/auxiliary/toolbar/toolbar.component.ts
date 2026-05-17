/**
 *  This module contains the {@link ToolbarComponent|`ToolbarComponent`} and related classes.
 *
 *  @module
 */
import {AfterViewInit, Component, Directive, EventEmitter, Input, Output} from '@angular/core';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';
import {MatDivider} from '@angular/material/divider';
import {TOOLTIP_TIMEOUT} from '../../../utils/constants';
import {MatBadge} from '@angular/material/badge';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {Observable, Subscription} from 'rxjs';
import {KeyboardEventPatch, patchKeyboardEvent} from '../../../utils/keyboard-help';
import {KEY_DISPLAY, Modifier, MODIFIER_DISPLAY} from './constants';

/**
 * A registry to keep track of {@link MatMenu|`<mat-menu>`} components generated for this toolbar.
 */
export class MenuRegistry {

    /** All the registered {@link MatMenu|`<mat-menu>`} components. Keys are the original element's {@link ToolbarButton#id|`id`}. */
    private menus = new Map<string, MatMenu>();

    /**
     * Register a menu.
     *
     * @param {string} id - The original element's {@link ToolbarButton#id|`id`}.
     * @param {MatMenu} menu - The {@link MatMenu|`<mat-menu>`}.
     */
    public set(id: string, menu: MatMenu): void {
        this.menus.set(id, menu);
    }

    /**
     * Get a menu.
     *
     * @param {string} id - The original element's {@link ToolbarButton#id|`id`}.
     * @returns {MatMenu | undefined} - The {@link MatMenu|`<mat-menu>`}.
     */
    public get(id: string): MatMenu | undefined {
        return this.menus.get(id);
    }
}

/**
 *  A directive to attach to a {@link MatMenu|`<mat-menu>`}, so that it gets registered when created.
 *
 * @directive
 * @directiveName `[menuRegister]`
 */
@Directive({
               selector: '[menuRegister]',
           })
export class MenuRegisterDirective {

    /**
     * The data about the menu to register.
     *
     * @input
     * @inputAlias menuRegister
     * @group Directive inputs
     */
    @Input('menuRegister')
    public set data(
        value: { id: string; menu: MatMenu }
    ) {
        this.registry.set(value.id, value.menu);
    }

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {MenuRegistry} registry - An instance of {@link MenuRegistry|`MenuRegistry`} to register the menu.
     *                                  Instantiated by dependency injection.
     */
    constructor(private registry: MenuRegistry) {}

}

/**
 * A toolbar that can be put on top of a screen or area, for which elements like buttons and text can be defined
 * by passing a list of {@link ToolbarElement|`ToolbarElement`s} to display.
 *
 * To populate the toolbar, pass an array of {@link ToolbarElement|`ToolbarElement`s} to the
 * {@link ToolbarComponent#elements|`elements`} input. To handle clicks on buttons,
 * attach to the {@link ToolbarComponent#elementSelected|`elementSelected`} output, which emits
 * the {@link ToolbarButton#id|`id`} of the clicked element.
 *
 * The component also handles keyboard shortcuts for the elements.
 *
 * @component
 * @componentSelector `<house-mix-toolbar>`
 */
@Component({
               selector:    'house-mix-toolbar',
               imports: [
                   MatIconButton,
                   MatIcon,
                   MatTooltipModule,
                   MatMenu,
                   MatMenuItem,
                   MenuRegisterDirective,
                   MatMenuTrigger,
                   MatDivider,
                   MatBadge,
                   MatProgressSpinner
               ],
               providers: [MenuRegistry],
               templateUrl: './toolbar.component.html',
               styleUrl:    './toolbar.component.scss'
           })
export class ToolbarComponent implements AfterViewInit {

    /**
     * The elements to display in the toolbar.
     *
     * @see {@link ToolbarElement|`ToolbarElement`} for information on the possible elements and
     * how to configure them.
     * @input
     */
    @Input() public set elements(elements: ToolbarElement[]) {
        this._elements = elements.slice().sort((a, b) => a.order - b.order);
        this.menus = [];
        this._elements.forEach(el => {this.extractMenus(el);});
        this.allElements = flattenMenus(this._elements);
    }

    /**
     * An observable producing {@link KeyboardEvent|`KeyboardEvent`s} for the
     * component to listen to in order to detect shortcuts.
     *
     * @input
     */
    @Input() public set keyObservable(value: Observable<KeyboardEvent>) {
        this.keySubscription?.unsubscribe();
        this.keySubscription = value.subscribe(event => {
            const patchedEvent = patchKeyboardEvent(event);
            this.keyPressed(patchedEvent);
        });
    }

    /**
     * Emits an event every time an element is clicked.
     * The emitted property is the {@link ToolbarButton#id|`id`} of the clicked element.
     *
     * @output
     */
    @Output() public elementSelected = new EventEmitter<string>;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {MenuRegistry} menuRegistry - An instance of {@link MenuRegistry|`MenuRegistry`} to track the created
     *                                      {@link MatMenu|`<mat-menu>`s}. Instantiated by dependency injection.
     */
    constructor(
        private menuRegistry: MenuRegistry
    ) {}

    /** The elements to display in the toolbar. */
    protected _elements: ToolbarElement[] = [];

    /** All submenus in {@link ToolbarComponent|`_elements`}. */
    protected menus: { for: string, menu: ToolbarElement[] }[] = [];

    /** All elements in {@link ToolbarComponent|`_elements`}, flattened. */
    private allElements: ToolbarElement[] = [];

    /** Flag that gets set when the toolbar has finished loading. */
    private loaded: boolean = false;

    /** The current active subscription to the {@link ToolbarComponent#keyObservable|`keyObservable`}. */
    private keySubscription: Subscription | null = null;

    /**
     * Click callback for {@link ToolbarButton|`ToolbarButton`} elements.
     *
     * @param {ToolbarButton} element - The element that was clicked.
     */
    protected onElementClick(element: ToolbarButton): void {
        if (element.submenu == null) {
            this.elementSelected.emit(element.id);
        }
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
    public ngAfterViewInit(): void {
        // It's done like this otherwise angular complains for some reason of changes to the values mid-cycle
        setTimeout(() => {this.loaded = true}, 0);
    }

    /**
     * Extract all the roots of the nested menus in an element,
     * and add them to the {@link ToolbarComponent#menus|`menus`}.
     *
     * @param {ToolbarElement} element - The element to extract the submenus from.
     */
    private extractMenus(element: ToolbarElement): void {
        if (element.type === ToolBarElementType.BUTTON) {
            if (element.submenu) {
                this.menus.push({
                                    for:  element.id,
                                    menu: element.submenu
                                });
            }
            element.submenu?.forEach(el => {this.extractMenus(el)});
        }
    }

    /**
     * Find a {@link MatMenu|`<mat-menu>`} with a specific id.
     *
     * @param {string} id - The {@link ToolbarButton#id|`id`} of the element root of the menu.
     * @returns {MatMenu | null} - The menu. `null` if no menu was found with that specific id or
     *                             if the component has not yet finished loading.
     * @protected
     */
    protected getMenu(id: string): MatMenu | null {
        if (!this.loaded) {
            return null;
        } else {
            return this.menuRegistry.get(id) ?? null
        }
    }

    /**
     * Get the text of a tooltip to show for a specific {@link ToolbarButton|`ToolbarButton`}.
     * Includes the shortcut text if applicable.
     *
     * @param {ToolbarButton} element - The element for which to generate the tooltip.
     * @returns {string} - The string to use as text for the tooltip.
     * @protected
     */
    protected getButtonTooltip(element: ToolbarButton): string {
        let result           = element.hint ?? '';
        const likelyKeyboard =
                  matchMedia('(hover: hover)').matches &&
                  matchMedia('(pointer: fine)').matches;
        if (!likelyKeyboard) {
            return result;
        }
        if (element.shortcut) {
            result += ' (';
            if (element.shortcut.shift) {
                result += MODIFIER_DISPLAY[Modifier.ALT];
            }
            if (element.shortcut.shift) {
                result += MODIFIER_DISPLAY[Modifier.SHIFT];
            }
            if (element.shortcut.osModifier) {
                result += MODIFIER_DISPLAY[Modifier.OS];
            }
            result += `${KEY_DISPLAY[element.shortcut.codes[0] ?? ''] ?? element.shortcut.codes[0] ?? ''})`;
        }
        return result;
    }


    /**
     * Handle a key press to check for shortcuts.
     *
     * @param {KeyboardEvent & KeyboardEventPatch} patchedEvent - The patched keyboard event.
     */
    private keyPressed(patchedEvent: KeyboardEvent & KeyboardEventPatch): void {
        for (const element of this.allElements) {
            if (element.type === ToolBarElementType.BUTTON) {
                if (element.shortcut) {
                    if (element.shortcut.codes.includes(patchedEvent.code) && element.shortcut.osModifier === patchedEvent.metaKey && element.shortcut.shift === patchedEvent.shiftKey &&
                        element.shortcut.alt === patchedEvent.altKey) {
                        this.onElementClick(element);
                        patchedEvent.preventDefault();
                        return;
                    }
                }
            }
        }
    }

    /** @ignore */
    protected readonly ToolBarElementType = ToolBarElementType;
    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT           = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly KEY_DISPLAY               = KEY_DISPLAY;
    /** @ignore */
    protected readonly Modifier                  = Modifier;
    /** @ignore */
    protected readonly MODIFIER_DISPLAY          = MODIFIER_DISPLAY;
}

/** An element to be shown in a {@link ToolbarComponent|`ToolbarComponent`}. */
export type ToolbarElement = ToolbarButton | ToolbarDivider | ToolbarSpacer | ToolbarTitle;

/** Possible types of {@link ToolbarElement|`ToolbarElement`s}. */
export enum ToolBarElementType {
    BUTTON  = 'BUTTON',
    DIVIDER = 'DIVIDER',
    SPACER  = 'SPACER',
    TITLE = 'TITLE',
}

/**
 * A toolbar element that will show as a button. In the toolbar, it gets shown
 * only as a flat icon button. In the menu, it's a menu item.
 */
export interface ToolbarButton {
    /** The type is {@link ToolBarElementType.BUTTON|`BUTTON`}. */
    type: ToolBarElementType.BUTTON;
    /** An identifier string. Used to uniquely track the button, for example in the {@link ToolbarComponent#elementSelected|`elementSelected`} output. */
    id: string;
    /** An optional hint to show on a tooltip when hovering over the button. */
    hint?: string;
    /** The {@link MatIcon|`<mat-icon>`} name of the icon to be shown in the button. It's the only oneif it's a button in the main bar, it is on the left of the menu item if in a menu. */
    icon: string;
    /** The display order among the button's siblings. */
    order: number;
    /** If defined, this button will open a submenu, with the elements of this array as items. */
    submenu?: ToolbarElement[];
    /** An optional round badge on the button. If `true`, shows only a round dot. If a `number`, the number will be displayed inside the dot. `false` or not defined don't show anything. */
    badge?: number | boolean;
    /** If `true`, a spinner will be shown instead of the icon, and the click are disabled. */
    loading?: boolean;
    /** An optional keyboard shortcut to trigger the click. */
    shortcut?: ToolbarShortcut;
    /** If `true`, the button will not be shown in the toolbar, but still respond to keyboard events. Useful to define actions that don't need a visible element in the toolbar. */
    shortcutOnly?: boolean;
}

/**
 * A toolbar element that will show as a vertical divider in a toolbar or horizontal divider in a submenu.
 */
export interface ToolbarDivider {
    /** The type is {@link ToolBarElementType.DIVIDER|`DIVIDER`}. */
    type: ToolBarElementType.DIVIDER;
    /** The display order among the button's siblings. */
    order: number;
    /** An identifier string. Used to uniquely track the button, for example in the {@link ToolbarComponent#elementSelected|`elementSelected`} output. */
    id: string;
}

/**
 * A toolbar element that will not show but create a greedy growing space in the toolbar. Useful to align elements to the right.
 */
export interface ToolbarSpacer {
    /** The type is {@link ToolBarElementType.DIVIDER|`DIVIDER`}. */
    type: ToolBarElementType.SPACER;
    /** The display order among the button's siblings. */
    order: number;
    /** An identifier string. Used to uniquely track the button, for example in the {@link ToolbarComponent#elementSelected|`elementSelected`} output. */
    id: string;
}

/**
 * This element will be shown as text with title emphasis in the toolbar.
 */
export interface ToolbarTitle {
    /** The type is {@link ToolBarElementType.DIVIDER|`DIVIDER`}. */
    type: ToolBarElementType.TITLE;
    /** The display order among the button's siblings. */
    order: number;
    /** An identifier string. Used to uniquely track the button, for example in the {@link ToolbarComponent#elementSelected|`elementSelected`} output. */
    id: string;
    /** The text to display. Can also be a function that evaluates to a `string` for dynamic text. */
    text: string | (() => string);
}

/** Defines a keyboard combination as a shortcut for a {@link ToolbarButton|`ToolbarButton`}. */
export interface ToolbarShortcut {
    /** All the keycodes that trigger the shortcut. */
    codes: string[],
    /** Whether the os-specific modifier key (Ctrl for Windows/Linux, Command for Mac/iOs) needs to be pressed to trigger the shortcut. */
    osModifier: boolean,
    /** Whether the shift key needs to be pressed to trigger the shortcut. */
    shift: boolean,
    /** Whether the alt key needs to be pressed to trigger the shortcut. */
    alt: boolean
}

/**
 * Flatten an array of {@link ToolbarElement|`ToolbarElement`s} by putting all submenu items in the same array.
 *
 * @param {ToolbarElement[]} elements - The array to flatten.
 * @returns {ToolbarElement[]} The flattened array.
 */
function flattenMenus(elements: ToolbarElement[]): ToolbarElement[] {
    return elements.flatMap(element => [
        element,
        ...((element.type === ToolBarElementType.BUTTON && element.submenu) ? flattenMenus(element.submenu) : [])
    ]);
}
