import {Component} from '@angular/core';
import {ToolbarComponent, ToolbarElement, ToolBarElementType} from '../auxiliary/toolbar/toolbar.component';
import {Router} from '@angular/router';
import {BetterMatDialog} from '../../utils/better-mat-dialog';
import {AddMixDialogComponent} from '../dialogs/add-mix-dialog/add-mix-dialog.component';

@Component({
               selector:    'house-mix-mixing',
               imports:     [
                   ToolbarComponent
               ],
               templateUrl: './mixing.component.html',
               styleUrl:    './mixing.component.scss'
           })
export class MixingComponent {


    constructor(
        private router: Router,
        private matDialog: BetterMatDialog
    ) {

    }

    protected get toolbarElements(): ToolbarElement[] {
        return this.filterToolbar();
    }

    private filterToolbar(toFilter: ToolbarElement[] = ALL_TOOLBAR_ELEMENTS): ToolbarElement[] {
        return toFilter
            .filter(toolbarElement => this.isToolbarElementVisible(toolbarElement))
            .map((el) => {
                if ((el.type == ToolBarElementType.BUTTON) && (el.submenu != null)) {
                    return {
                        ...el,
                        submenu: this.filterToolbar(el.submenu)
                    };
                } else {
                    return el;
                }
            });
    }

    protected toolbarClick(id: ToolbarAction): void {
        switch (id) {
            case ToolbarAction.DELETE:
                break;
            case ToolbarAction.ADD: {
                this
                    .matDialog
                    .open(
                        AddMixDialogComponent,
                        {}
                    )
                    .afterClosed()
                    .subscribe(result => {

                    });
                break;
            }
            case ToolbarAction.DEVICES: {
                this.goTo('home');
                break;
            }
            case ToolbarAction.MIXING: {
                break;
            }
            case ToolbarAction.SYSTEM: {
                this.goTo('system');
                break;
            }
        }
    }

    private isToolbarElementVisible(toolbarElement: ToolbarElement): boolean {
        if (!Object.values<string>(ToolbarAction).includes(toolbarElement.id)) {
            return true;
        }
        switch (toolbarElement.id as ToolbarAction) {
            case ToolbarAction.DELETE:
                return false;
            case ToolbarAction.ADD:
            case ToolbarAction.DEVICES:
            case ToolbarAction.MIXING:
            case ToolbarAction.SYSTEM:
                return true;
        }
    }

    protected goTo(section: string): void {
        void this.router.navigate([section]);
    }


    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }
}


enum ToolbarAction {
    DEVICES = 'devices',
    MIXING  = 'mixing',
    SYSTEM  = 'system',
    DELETE  = 'delete',
    ADD     = 'add'
}

const ALL_TOOLBAR_ELEMENTS: ToolbarElement[] = [
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'dashboard',
        id:    ToolbarAction.DEVICES,
        hint:  'Device view',
        order: 0
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'instant_mix',
        id:    ToolbarAction.MIXING,
        hint:  'Mixing',
        order: 0
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'hub',
        id:    ToolbarAction.SYSTEM,
        hint:  'System view',
        order: 0
    },
    {
        type:  ToolBarElementType.SPACER,
        id:    'spacer-1',
        order: 1
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'add',
        id:    ToolbarAction.ADD,
        hint:  'Add a mix',
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Delete',
        order: 2
    }

];
