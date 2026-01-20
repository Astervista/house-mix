import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {ToolbarComponent, ToolbarElement, ToolBarElementType} from '../auxiliary/toolbar/toolbar.component';
import {MatDialog} from '@angular/material/dialog';
import {AddGroupDialogComponent, AddGroupDialogData, AddGroupDialogResult} from '../dialogs/add-group-dialog/add-group-dialog.component';
import {Group} from '@common/devices/group/group';
import {Actuator} from '@common/devices/actuator/actuator';
import {GroupService} from '../../services/group.service';
import {HttpErrorResponse, HttpStatusCode} from '@angular/common/http';
import {MatSnackBar} from '@angular/material/snack-bar';
import {SNACKBAR_TIMEOUT} from '../../utils/constants';
import {GroupComponent} from '../entities/devices/group/group.component';
import {ChangeGroupDialogComponent, ChangeGroupDialogData, TopmostResult} from '../dialogs/change-group-dialog/change-group-dialog.component';
import {DeleteGroupDialogComponent, DeleteGroupDialogData} from '../dialogs/delete-group-dialog/delete-group-dialog.component';
import {DeleteGroupChildFate, DeleteGroupOptions} from '@common/devices/group/rest-classes';


@Component({
               selector:    'house-mix-home',
               imports:     [
                   ToolbarComponent,
                   GroupComponent
               ],
               templateUrl: './home.component.html',
               styleUrl:    './home.component.scss'
           })
export class HomeComponent {

    protected readonly rootGroups: Group[] = [];
    protected readonly allGroups: Group[]  = [];

    protected selectedObject: Group | Actuator | null = null;

    constructor(
        private router: Router,
        private matDialog: MatDialog,
        private groupService: GroupService,
        private snackbar: MatSnackBar
    ) {
        groupService
            .getAllGroups()
            .then((groups) => {
                this.allGroups.push(...groups);
                this.rootGroups.push(...groups);
                for (const group of groups) {
                    for (const childGroup of group.groups) {
                        const index = this.rootGroups.findIndex(otherGroup => otherGroup.name == childGroup);
                        if (index !== -1) {
                            this.rootGroups.splice(index, 1);
                        }
                    }
                }
            })
            .catch(() => {
                // TODO: Check
            });
    }

    protected get toolbarElements(): ToolbarElement[] {
        return this.filterToolbar();
    }

    protected get selectedGroup(): Group | null {
        if (this.selectedObject instanceof Group) {
            return this.selectedObject;
        } else {
            return null;
        }
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

    private isToolbarElementVisible(toolbarElement: ToolbarElement): boolean {
        switch (toolbarElement.id) {
            case ToolbarAction.DELETE as string:
            case ToolbarAction.EDIT as string:
            case ToolbarAction.MOVE as string:
                return this.selectedObject != null;
            default:
                return true;
        }
    }

    protected goTo(section: string): void {
        void this.router.navigate([section]);
    }

    protected toolbarClick(id: ToolbarAction): void {
        switch (id) {
            case ToolbarAction.ADD_GROUP:
                this.matDialog.open<AddGroupDialogComponent, AddGroupDialogData, AddGroupDialogResult>
                (
                    AddGroupDialogComponent,
                    {
                        data: {
                            sonOfGroup:    this.selectedGroup?.name ?? null,
                            groupNames:    this.allGroups.map(group => group.name),
                            groupDisplays: this.allGroups.map(group => group.displayName)
                        }
                    }
                )
                    .afterClosed()
                    .subscribe(result => {
                        if (result != null) {
                            this
                                .groupService
                                .createGroup(
                                    result.group,
                                    {
                                        parent: result.parent ?? undefined
                                    }
                                )
                                .then(() => {
                                    if (result.parent == null) {
                                        this.rootGroups.push(result.group);
                                    } else {
                                        const parentGroup = this.allGroups.find(otherGroup => otherGroup.name == result.parent);
                                        if (parentGroup != null) {
                                            parentGroup.addGroup(result.group.name);
                                        }
                                    }
                                    this.allGroups.push(result.group);
                                })
                                .catch((e: unknown) => {
                                    if (e instanceof HttpErrorResponse) {
                                        if (e.status as HttpStatusCode == HttpStatusCode.Conflict) {
                                            this.snackbar.open(
                                                'The group codename is already in use. Create a group with a different one',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                            return;
                                        }
                                    }
                                    this.snackbar.open(
                                        'There has been an error while creating the group',
                                        undefined,
                                        {
                                            duration: SNACKBAR_TIMEOUT
                                        }
                                    );
                                });
                        }
                    });
                break;
            case ToolbarAction.ADD_ACTUATOR:
                // TODO
                break;
            case ToolbarAction.ADD_SENSOR:
                // TODO
                break;
            case ToolbarAction.DELETE: {
                const selectedObject = this.selectedObject;
                if (selectedObject != null) {
                    if (selectedObject instanceof Group) {
                        const descendants = selectedObject.getAllDescendants(this.allGroups);
                        const availableGroups = this.allGroups.filter(group => !descendants.includes(group.name));
                        this.matDialog.open<DeleteGroupDialogComponent, DeleteGroupDialogData, DeleteGroupOptions>
                        (
                            DeleteGroupDialogComponent,
                            {
                                data: {
                                    groupNames:    availableGroups.map(group => group.name),
                                    groupDisplays: availableGroups.map(group => group.displayName),
                                    toDelete:      selectedObject
                                }
                            }
                        )
                            .afterClosed()
                            .subscribe(result => {
                                if (result != null) {
                                    this
                                        .groupService
                                        .deleteGroup(
                                            result,
                                            {
                                                name: selectedObject.name
                                            }
                                        )
                                        .then(() => {
                                            let destinationGroup: Group | null = null;
                                            switch (result.fate) {
                                                case null:
                                                case DeleteGroupChildFate.ROOT_LEVEL: {
                                                    destinationGroup = null;
                                                    break;
                                                }
                                                case DeleteGroupChildFate.CURRENT_LEVEL: {
                                                    destinationGroup = this.allGroups.find(group => group.containsGroup(selectedObject.name)) ?? null;
                                                    break;
                                                }
                                                case DeleteGroupChildFate.CHOOSE_WHERE: {
                                                    destinationGroup = this.allGroups.find(group => group.name == result.parent) ?? null;
                                                    break;
                                                }
                                            }
                                            const parentGroup =
                                                            this.allGroups.find(group => group.containsGroup(selectedObject.name));
                                            if (parentGroup != null) {
                                                parentGroup.removeGroup(selectedObject.name);
                                            } else {
                                                const index = this.rootGroups.findIndex(group => group.name == selectedObject.name);
                                                if (index !== -1) {
                                                    this.rootGroups.splice(index, 1);
                                                }
                                            }
                                            if (selectedObject.hasChildren) {
                                                if (destinationGroup != null) {
                                                    selectedObject.groups.forEach(group => { destinationGroup.addGroup(group) });
                                                    selectedObject.actuators.forEach(actuator => { destinationGroup.addActuator(actuator) });
                                                    //TODO: Add other children
                                                } else {
                                                    selectedObject.groups.forEach(groupName => {
                                                        const group = this.allGroups.find(g => g.name === groupName);
                                                        if (group) {
                                                            this.rootGroups.push(group);
                                                        }
                                                    });
                                                    selectedObject.actuators.forEach(() => {
                                                        // TODO: Handle actuators at root level if needed, currently they are just removed from the deleted group
                                                    });
                                                    // TODO: Handle other children
                                                }
                                            }
                                            const index = this.allGroups.findIndex(group => group.name === selectedObject.name);
                                            if (index !== -1) {
                                                this.allGroups.splice(index, 1);
                                            }
                                        })
                                        .catch(() => {
                                            this.snackbar.open(
                                                'There has been an error while creating the group',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                        });
                                }
                            });
                    }
                }
                break;
            }
            case ToolbarAction.EDIT: {
                const selectedObject = this.selectedObject;
                if (selectedObject != null) {
                    if (selectedObject instanceof Group) {
                        this.matDialog.open<AddGroupDialogComponent, AddGroupDialogData, AddGroupDialogResult>
                        (
                            AddGroupDialogComponent,
                            {
                                data: {
                                    sonOfGroup:    null,
                                    groupNames:    this.allGroups.map(group => group.name),
                                    groupDisplays: this.allGroups.map(group => group.displayName),
                                    edit:          {
                                        displayName: selectedObject.displayName,
                                        name:        selectedObject.name
                                    }
                                }
                            }
                        )
                            .afterClosed()
                            .subscribe(result => {
                                if (result != null) {
                                    this
                                        .groupService
                                        .editGroup(
                                            result.group,
                                            {
                                                name: selectedObject.name
                                            }
                                        )
                                        .then(() => {
                                            const oldName              = selectedObject.name;
                                            selectedObject.name        = result.group.name;
                                            selectedObject.displayName = result.group.displayName;
                                            for (const group of this.allGroups) {
                                                group.groupRenamed(oldName, result.group.name);
                                            }
                                        })
                                        .catch((e: unknown) => {
                                            if (e instanceof HttpErrorResponse) {
                                                if (e.status as HttpStatusCode == HttpStatusCode.Conflict) {
                                                    this.snackbar.open(
                                                        'The group codename is already in use. Create a group with a different one',
                                                        undefined,
                                                        {
                                                            duration: SNACKBAR_TIMEOUT
                                                        }
                                                    );
                                                    return;
                                                }
                                            }
                                            this.snackbar.open(
                                                'There has been an error while creating the group',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                        });
                                }
                            });
                    }
                }
                break;
            }
            case ToolbarAction.MOVE: {
                const selectedObject = this.selectedObject;
                if (selectedObject != null) {
                    let availableGroups: readonly Group[];
                    if (selectedObject instanceof Group) {
                        const descendants = selectedObject.getAllDescendants(this.allGroups);
                        availableGroups = this.allGroups.filter(group => !descendants.includes(group.name));
                    } else {
                        availableGroups = this.allGroups;
                    }
                    this.matDialog.open<ChangeGroupDialogComponent, ChangeGroupDialogData, string | null | TopmostResult>
                    (
                        ChangeGroupDialogComponent,
                        {
                            data: {
                                sonOfGroup:    this.allGroups.find(group => group.containsGroup(selectedObject.name))?.name ?? null,
                                groupNames:    availableGroups.map(group => group.name),
                                groupDisplays: availableGroups.map(group => group.displayName),
                                self:          selectedObject.name
                            }
                        }
                    )
                        .afterClosed()
                        .subscribe(result => {
                            if (result != null) {
                                let newParentName: string | null;
                                if (typeof result != 'string') {
                                    newParentName = null;
                                } else {
                                    newParentName = result;
                                }
                                if (selectedObject instanceof Group) {
                                    this
                                        .groupService
                                        .changeParent(
                                            {
                                                parent: newParentName
                                            },
                                            {
                                                name: selectedObject.name
                                            }
                                        )
                                        .then(() => {
                                            const oldParent = this.allGroups.find(group => group.containsGroup(selectedObject.name));
                                            if (oldParent != null) {
                                                oldParent.removeGroup(selectedObject.name);
                                            } else {
                                                const index = this.rootGroups.findIndex(group => group.name == selectedObject.name);
                                                if (index !== -1) {
                                                    this.rootGroups.splice(index, 1);
                                                }
                                            }
                                            const newParent = this.allGroups.find(group => group.name == newParentName);
                                            if (newParent != null) {
                                                newParent.addGroup(selectedObject.name);
                                            } else {
                                                this.rootGroups.push(selectedObject);
                                            }
                                        })
                                        .catch(() => {
                                            this.snackbar.open(
                                                'There has been an error while creating the group',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                        });
                                }
                            }
                        });
                }
                break;
            }
        }
    }

    protected readonly ToolbarAction = ToolbarAction;

    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

}

enum ToolbarAction {
    DELETE       = 'delete',
    EDIT         = 'edit',
    MOVE         = 'move',
    ADD_GROUP    = 'add-group',
    ADD_ACTUATOR = 'add-actuator',
    ADD_SENSOR   = 'add-sensor'
}

const ALL_TOOLBAR_ELEMENTS: ToolbarElement[] = [
    {
        type:  ToolBarElementType.SPACER,
        id:    'spacer-1',
        order: 0
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'edit',
        id:    ToolbarAction.EDIT,
        hint:  'Remove',
        order: 0
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'move_item',
        id:    ToolbarAction.MOVE,
        hint:  'Move',
        order: 0
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Remove',
        order: 0
    },
    {
        type:    ToolBarElementType.BUTTON,
        icon:    'add',
        id:      'add',
        order:   1,
        hint:    'Add some new entity',
        submenu: [
            {
                type:  ToolBarElementType.BUTTON,
                icon:  'ad_group',
                id:    ToolbarAction.ADD_GROUP,
                hint:  'Create a new group',
                order: 0
            },
            {
                type:    ToolBarElementType.BUTTON,
                icon:    'power',
                id:      'add-device',
                hint:    'Register a new device',
                order:   1,
                submenu: [
                    {
                        type:  ToolBarElementType.BUTTON,
                        icon:  'lightbulb',
                        id:    ToolbarAction.ADD_ACTUATOR,
                        hint:  'Register a new actuator',
                        order: 0
                    },
                    {
                        type:  ToolBarElementType.BUTTON,
                        icon:  'detector',
                        id:    ToolbarAction.ADD_SENSOR,
                        hint:  'Register a new sensor',
                        order: 2
                    }
                ]
            }
        ]
    }

];
