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

export class MenuRegistry {

    private menus = new Map<string, MatMenu>();

    public set(id: string, menu: MatMenu): void {
        this.menus.set(id, menu);
    }

    public get(id: string): MatMenu | undefined {
        return this.menus.get(id);
    }
}

@Directive({
               selector: '[menuRegister]',
           })
export class MenuRegisterDirective {

    @Input('menuRegister') public set data(
        value: { id: string; menu: MatMenu }
    ) {
        this.registry.set(value.id, value.menu);
    }

    constructor(private registry: MenuRegistry) {}

}

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

    @Input() public set elements(elements: ToolbarElement[]) {
        this._elements = elements.slice().sort((a, b) => a.order - b.order);
        this.menus = [];
        this._elements.forEach(el => {this.extractMenus(el);});
        this.allElements = flattenMenus(this._elements);
    }

    @Input() public set keyObservable(value: Observable<KeyboardEvent>) {
        this.keySubscription?.unsubscribe();
        this.keySubscription = value.subscribe(event => {
            const patchedEvent = patchKeyboardEvent(event);
            this.keyPressed(patchedEvent);
        });
    }

    @Output() public elementSelected = new EventEmitter<string>;

    constructor(
        private menuRegistry: MenuRegistry
    ) {}

    protected _elements: ToolbarElement[] = [];

    protected menus: { for: string, menu: ToolbarElement[] }[] = [];

    private allElements: ToolbarElement[] = [];

    private loaded: boolean = false;

    private keySubscription: Subscription | null = null;

    protected onElementClick(element: ToolbarButton): void {
        if (element.submenu == null) {
            this.elementSelected.emit(element.id);
        }
    }

    public ngAfterViewInit(): void {
        // It's done like this otherwise angular complains for some reason because angular complains of changes to the values mid-cycle
        setTimeout(() => {this.loaded = true}, 0);
    }

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

    protected getMenu(id: string): MatMenu | null {
        if (!this.loaded) {
            return null;
        } else {
            return this.menuRegistry.get(id) ?? null
        }
    }

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

    protected readonly ToolBarElementType = ToolBarElementType;
    protected readonly TOOLTIP_TIMEOUT           = TOOLTIP_TIMEOUT;
    protected readonly KEY_DISPLAY               = KEY_DISPLAY;
    protected readonly Modifier                  = Modifier;
    protected readonly MODIFIER_DISPLAY          = MODIFIER_DISPLAY;
}

export type ToolbarElement = ToolbarButton | ToolbarDivider | ToolbarSpacer | ToolbarTitle;

export enum ToolBarElementType {
    BUTTON  = 'BUTTON',
    DIVIDER = 'DIVIDER',
    SPACER  = 'SPACER',
    TITLE = 'TITLE',
}

export interface ToolbarButton {
    type: ToolBarElementType.BUTTON;
    id: string;
    hint?: string;
    icon: string;
    order: number;
    submenu?: ToolbarElement[];
    badge?: number | boolean;
    loading?: boolean;
    shortcut?: ToolbarShortcut;
    shortcutOnly?: boolean;
}

export interface ToolbarDivider {
    type: ToolBarElementType.DIVIDER;
    order: number;
    id: string;
}

export interface ToolbarSpacer {
    type: ToolBarElementType.SPACER;
    order: number;
    id: string;
}

export interface ToolbarTitle {
    type: ToolBarElementType.TITLE;
    order: number;
    id: string;
    text: string | (() => string);
}


export interface ToolbarShortcut {
    codes: string[],
    osModifier: boolean,
    shift: boolean,
    alt: boolean
}

function flattenMenus(elements: ToolbarElement[]): ToolbarElement[] {
    return elements.flatMap(element => [
        element,
        ...((element.type === ToolBarElementType.BUTTON && element.submenu) ? flattenMenus(element.submenu) : [])
    ]);
}
