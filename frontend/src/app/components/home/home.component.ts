import {Component, HostListener} from '@angular/core';
import {Router} from '@angular/router';
import {ToolbarComponent, ToolbarElement, ToolBarElementType} from '../auxiliary/toolbar/toolbar.component';
import {AddEntityDialogComponent} from '../dialogs/add-entity-dialog/add-entity-dialog.component';
import {Group} from '@common/devices/group/group';
import {Actuator} from '@common/devices/actuator/actuator';
import {Sensor} from '@common/devices/sensor/sensor';
import {Device} from '@common/devices/device';
import {Datum} from '@common/mixing/mix/datum';
import {EntityType} from '@common/devices/constants';
import {GroupService} from '../../services/group.service';
import {HttpErrorResponse, HttpStatusCode} from '@angular/common/http';
import {MatSnackBar} from '@angular/material/snack-bar';
import {SNACKBAR_TIMEOUT} from '../../utils/constants';
import {GroupComponent} from '../entities/devices/group/group.component';
import {ChangeGroupDialogComponent} from '../dialogs/change-group-dialog/change-group-dialog.component';
import {DeleteEntityDialogComponent} from '../dialogs/delete-entity-dialog/delete-entity-dialog.component';
import {DeleteGroupChildFate} from '@common/devices/group/rest-classes';
import {DeviceService} from '../../services/device.service';
import {DeviceComponent} from '../entities/devices/device/device.component';
import {MatIcon} from '@angular/material/icon';
import {BetterMatDialog} from '../../utils/better-mat-dialog';
import {DynamicSvgComponent} from '../auxiliary/dynamic-svg/dynamic-svg.component';
import {LoadingStatus} from '../../utils/enums';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatButton, MatIconButton} from '@angular/material/button';
import {LocalStorageService} from '../../services/local-storage.service';
import {LOCAL_SETTINGS_KEY} from '../system/settings/settings.component';
import {MatNestedTreeNode, MatTree, MatTreeNestedDataSource, MatTreeNodeDef, MatTreeNodeOutlet, MatTreeNodeToggle} from '@angular/material/tree';
import {Subject} from 'rxjs';


@Component({
               selector:    'house-mix-home',
               imports: [
                   ToolbarComponent,
                   GroupComponent,
                   DeviceComponent,
                   MatIcon,
                   DynamicSvgComponent,
                   MatProgressSpinner,
                   MatButton,
                   MatTree,
                   MatNestedTreeNode,
                   MatTreeNodeDef,
                   MatTreeNodeToggle,
                   MatIconButton,
                   MatTreeNodeOutlet
               ],
               templateUrl: './home.component.html',
               styleUrl:    './home.component.scss'
           })
export class HomeComponent {

    protected readonly rootGroups: Group[] = [];
    protected readonly allGroups: Group[]  = [];

    protected readonly rootActuators: Actuator[] = [];
    protected readonly allActuators: Actuator[]  = [];

    protected readonly rootSensors: Sensor[] = [];
    protected readonly allSensors: Sensor[]  = [];

    protected selectedObject: Group | Device | null = null;

    protected loadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected randomIcon: string = Math.random() > 0.5 ? 'clock.svg' : 'hourglass.svg';

    protected treeView: boolean;
    protected dataSource           = new MatTreeNestedDataSource<Group>();
    protected treeChildrenAccessor = (node: Group): Group[] => this.allGroups.filter(group => node.containsGroup(group.name));
    protected treeHasChildren      = (_: number, node: Group): boolean => (node.groups.length + node.sensors.length + node.actuators.length) > 0;

    constructor(
        private router: Router,
        private matDialog: BetterMatDialog,
        private groupService: GroupService,
        private deviceService: DeviceService,
        private snackBar: MatSnackBar,
        localStoragesService: LocalStorageService
    ) {
        this.treeView        = localStoragesService.getItem(LOCAL_SETTINGS_KEY).deviceViewLayoutTree;
        this.dataSource.data = this.rootGroups;
        this.reload();
    }

    protected reload(): void {
        const groupService = this.groupService;
        const deviceService = this.deviceService;
        this.loadingStatus = LoadingStatus.LOADING;
        this.rootGroups.splice(0, Infinity);
        this.allGroups.splice(0, Infinity);
        this.rootActuators.splice(0, Infinity);
        this.allActuators.splice(0, Infinity);
        this.rootSensors.splice(0, Infinity);
        this.allSensors.splice(0, Infinity);
        this.selectedObject = null;
        Promise
            .all([
                     groupService
                         .getAllGroups()
                         .then((groups) => {
                             this.allGroups.push(...groups);
                         }),

                     deviceService
                         .getActuators()
                         .then((actuators) => {
                             this.allActuators.push(...actuators);
                         }),

                     deviceService
                         .getSensors()
                         .then((sensors) => {
                             this.allSensors.push(...sensors);
                         })
                 ]
            )
            .then(() => {
                this.rootGroups.push(...this.allGroups);
                this.rootActuators.push(...this.allActuators);
                this.rootSensors.push(...this.allSensors);
                for (const group of this.allGroups) {
                    for (const childGroup of group.groups) {
                        const index = this.rootGroups.findIndex(otherGroup => otherGroup.name == childGroup);
                        if (index !== -1) {
                            this.rootGroups.splice(index, 1);
                        }
                    }
                    for (const childActuator of group.actuators) {
                        const index = this.rootActuators.findIndex(otherActuator => otherActuator.name == childActuator);
                        if (index !== -1) {
                            this.rootActuators.splice(index, 1);
                        }
                    }
                    for (const childSensor of group.sensors) {
                        const index = this.rootSensors.findIndex(otherSensor => otherSensor.name == childSensor);
                        if (index !== -1) {
                            this.rootSensors.splice(index, 1);
                        }
                    }
                }
                this.loadingStatus = LoadingStatus.LOADED;
            })
            .catch(() => {
                this.loadingStatus = LoadingStatus.ERROR;
            });
    }

    protected keySubject: Subject<KeyboardEvent> = new Subject<KeyboardEvent>();

    @HostListener('keydown', ['$event'])
    public onKeyDown(event: KeyboardEvent): void {
        this.keySubject.next(event);
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

    private isToolbarElementVisible(toolbarElement: ToolbarElement): boolean {
        if (this.loadingStatus != LoadingStatus.LOADED) {
            return [
                ToolbarAction.DEVICES,
                ToolbarAction.MIXING,
                ToolbarAction.SYSTEM
            ]
                .includes(toolbarElement.id as ToolbarAction);
        }
        switch (toolbarElement.id as ToolbarAction) {
            case ToolbarAction.DELETE:
            case ToolbarAction.EDIT:
            case ToolbarAction.MOVE:
                return this.selectedObject != null;
            case ToolbarAction.DEVICES:
            case ToolbarAction.MIXING:
            case ToolbarAction.SYSTEM:
            case ToolbarAction.ADD_GROUP:
            case ToolbarAction.ADD_ACTUATOR:
            case ToolbarAction.ADD_SENSOR:
                return true;
        }
        return true;
    }

    protected goTo(section: string): void {
        void this.router.navigate([section]);
    }

    protected toolbarClick(id: ToolbarAction): void {
        switch (id) {
            case ToolbarAction.DEVICES: {
                break;
            }
            case ToolbarAction.MIXING: {
                this.goTo('mixing');
                break;
            }
            case ToolbarAction.SYSTEM: {
                this.goTo('system');
                break;
            }
            case ToolbarAction.ADD_GROUP: {
                this.matDialog
                    .open(
                        AddEntityDialogComponent,
                        {
                            data: {
                                entityType:     EntityType.GROUP,
                                sonOfGroup:     this.selectedGroup?.name ?? null,
                                groupNames:     this.allGroups.map(group => group.name),
                                groupDisplays:  this.allGroups.map(group => group.displayName),
                                forbiddenNames: this.allGroups.map(group => group.name)
                            }
                        }
                    )
                    .afterClosed()
                    .subscribe(result => {
                        if (result != null) {
                            if ((result.type != EntityType.GROUP) || (result.edit)) {
                                return;
                            }
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
                                    this.updateTree();
                                })
                                .catch((e: unknown) => {
                                    if (e instanceof HttpErrorResponse) {
                                        if (e.status as HttpStatusCode == HttpStatusCode.Conflict) {
                                            this.snackBar.open(
                                                'The group codename is already in use. Create a group with a different one',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                            return;
                                        }
                                    }
                                    this.snackBar.open(
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
            }
            case ToolbarAction.ADD_ACTUATOR:
            case ToolbarAction.ADD_SENSOR: {
                this.matDialog.open(
                    AddEntityDialogComponent,
                    {
                        data: {
                            entityType:     id == ToolbarAction.ADD_ACTUATOR ? EntityType.ACTUATOR : EntityType.SENSOR,
                            sonOfGroup:     this.selectedGroup?.name ?? null,
                            groupNames:     this.allGroups.map(group => group.name),
                            groupDisplays:  this.allGroups.map(group => group.displayName),
                            forbiddenNames: (id == ToolbarAction.ADD_ACTUATOR ? this.allActuators : this.allSensors).map(device => device.name)
                        }
                    }
                )
                    .afterClosed()
                    .subscribe(result => {
                        if (result != null) {
                            if (result.edit) {
                                return;
                            }
                            if (id == ToolbarAction.ADD_ACTUATOR && result.type == EntityType.ACTUATOR) {
                                this
                                    .deviceService
                                    .createActuator(
                                        result.actuator,
                                        {
                                            parent: result.parent ?? undefined
                                        }
                                    )
                                    .then(() => {
                                        if (result.parent == null) {
                                            this.rootActuators.push(result.actuator);
                                        } else {
                                            const parentGroup = this.allGroups.find(otherGroup => otherGroup.name == result.parent);
                                            if (parentGroup != null) {
                                                parentGroup.addActuator(result.actuator.name);
                                            }
                                        }
                                        this.allActuators.push(result.actuator);
                                        this.updateTree();
                                    })
                                    .catch((e: unknown) => {
                                        if (e instanceof HttpErrorResponse) {
                                            if (e.status as HttpStatusCode == HttpStatusCode.Conflict) {
                                                this.snackBar.open(
                                                    'The actuator codename is already in use. Create an actuator with a different one',
                                                    undefined,
                                                    {
                                                        duration: SNACKBAR_TIMEOUT
                                                    }
                                                );
                                                return;
                                            }
                                        }
                                        this.snackBar.open(
                                            'There has been an error while creating the actuator',
                                            undefined,
                                            {
                                                duration: SNACKBAR_TIMEOUT
                                            }
                                        );
                                    });
                            } else if (id == ToolbarAction.ADD_SENSOR && result.type == EntityType.SENSOR) {
                                this
                                    .deviceService
                                    .createSensor(
                                        result.sensor,
                                        {
                                            parent: result.parent ?? undefined
                                        }
                                    )
                                    .then(() => {
                                        if (result.parent == null) {
                                            this.rootSensors.push(result.sensor);
                                        } else {
                                            const parentGroup = this.allGroups.find(otherGroup => otherGroup.name == result.parent);
                                            if (parentGroup != null) {
                                                parentGroup.addSensor(result.sensor.name);
                                            }
                                        }
                                        this.allSensors.push(result.sensor);
                                        this.updateTree();
                                    })
                                    .catch((e: unknown) => {
                                        if (e instanceof HttpErrorResponse) {
                                            if (e.status as HttpStatusCode == HttpStatusCode.Conflict) {
                                                this.snackBar.open(
                                                    'The sensor codename is already in use. Create an sensor with a different one',
                                                    undefined,
                                                    {
                                                        duration: SNACKBAR_TIMEOUT
                                                    }
                                                );
                                                return;
                                            }
                                        }
                                        this.snackBar.open(
                                            'There has been an error while creating the sensor',
                                            undefined,
                                            {
                                                duration: SNACKBAR_TIMEOUT
                                            }
                                        );
                                    });
                            }
                        }
                    });
                break;
            }
            case ToolbarAction.DELETE: {
                const selectedObject = this.selectedObject;
                if (selectedObject != null) {
                    if (selectedObject instanceof Group) {
                        const descendants     = selectedObject.getAllDescendants(this.allGroups);
                        const availableGroups = this.allGroups.filter(group => !descendants.includes(group.name));
                        this.matDialog.open(
                            DeleteEntityDialogComponent,
                            {
                                data: {
                                    groupNames:    availableGroups.map(group => group.name),
                                    groupDisplays: availableGroups.map(group => group.displayName),
                                    entityType:    EntityType.GROUP,
                                    groupToDelete: selectedObject
                                }
                            }
                        )
                            .afterClosed()
                            .subscribe(result => {
                                if (result != null && result != false && result != true) {
                                    this.selectedObject = null;
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
                                                    selectedObject.groups.forEach(group => { destinationGroup.addGroup(group); });
                                                    selectedObject.actuators.forEach(actuator => { destinationGroup.addActuator(actuator); });
                                                    selectedObject.sensors.forEach(sensor => { destinationGroup.addSensor(sensor); });
                                                } else {
                                                    selectedObject.groups.forEach(groupName => {
                                                        const group = this.allGroups.find(g => g.name === groupName);
                                                        if (group) {
                                                            this.rootGroups.push(group);
                                                        }
                                                    });
                                                    selectedObject.actuators.forEach(actuatorName => {
                                                        const actuator = this.allActuators.find(a => a.name === actuatorName);
                                                        if (actuator != null) {
                                                            this.rootActuators.push(actuator);
                                                        }
                                                    });
                                                    selectedObject.sensors.forEach(sensorName => {
                                                        const sensor = this.allSensors.find(s => s.name === sensorName);
                                                        if (sensor != null) {
                                                            this.rootSensors.push(sensor);
                                                        }
                                                    });
                                                }
                                            }
                                            const index = this.allGroups.findIndex(group => group.name === selectedObject.name);
                                            if (index !== -1) {
                                                this.allGroups.splice(index, 1);
                                            }
                                            this.updateTree();
                                        })
                                        .catch(() => {
                                            this.snackBar.open(
                                                'There has been an error while deleting the group',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                        });
                                }
                            });
                    } else if (selectedObject instanceof Actuator) {

                        this.matDialog.open(
                            DeleteEntityDialogComponent,
                            {
                                data: {
                                    entityType:       EntityType.ACTUATOR,
                                    actuatorToDelete: selectedObject
                                }
                            }
                        )
                            .afterClosed()
                            .subscribe(result => {
                                if (result == true) {
                                    this.selectedObject = null;
                                    this
                                        .deviceService
                                        .deleteActuator(
                                            {
                                                name: selectedObject.name
                                            }
                                        )
                                        .then(() => {
                                            const parentGroup = this.allGroups.find(group => group.containsActuator(selectedObject.name));
                                            if (parentGroup != null) {
                                                parentGroup.removeActuator(selectedObject.name);
                                            } else {
                                                const index = this.rootActuators.findIndex(
                                                    actuator => actuator.name == selectedObject.name
                                                );
                                                if (index !== -1) {
                                                    this.rootActuators.splice(index, 1);
                                                }
                                            }
                                            this.updateTree();
                                        })
                                        .catch(() => {
                                            this.snackBar.open(
                                                'There has been an error while deleting the actuator',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                        });
                                }
                            });
                    } else if (selectedObject instanceof Sensor) {

                        this.matDialog.open(
                            DeleteEntityDialogComponent,
                            {
                                data: {
                                    entityType:     EntityType.SENSOR,
                                    sensorToDelete: selectedObject
                                }
                            }
                        )
                            .afterClosed()
                            .subscribe(result => {
                                if (result == true) {
                                    this.selectedObject = null;
                                    this
                                        .deviceService
                                        .deleteSensor(
                                            {
                                                name: selectedObject.name
                                            }
                                        )
                                        .then(() => {
                                            const parentGroup = this.allGroups.find(group => group.containsSensor(selectedObject.name));
                                            if (parentGroup != null) {
                                                parentGroup.removeSensor(selectedObject.name);
                                            } else {
                                                const index = this.rootSensors.findIndex(
                                                    sensor => sensor.name == selectedObject.name
                                                );
                                                if (index !== -1) {
                                                    this.rootSensors.splice(index, 1);
                                                }
                                            }
                                            this.updateTree();
                                        })
                                        .catch(() => {
                                            this.snackBar.open(
                                                'There has been an error while deleting the sensor',
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
                        this.matDialog.open(
                            AddEntityDialogComponent,
                            {
                                data: {
                                    entityType:     EntityType.GROUP,
                                    sonOfGroup:     null,
                                    groupNames:     this.allGroups.map(group => group.name),
                                    groupDisplays:  this.allGroups.map(group => group.displayName),
                                    forbiddenNames: this.allGroups.map(group => group.name),
                                    edit:           {
                                        displayName: selectedObject.displayName,
                                        name:        selectedObject.name
                                    }
                                }
                            }
                        )
                            .afterClosed()
                            .subscribe(result => {
                                if (result != null) {
                                    if (result.type != EntityType.GROUP || !result.edit) {
                                        return;
                                    }
                                    this
                                        .groupService
                                        .editGroup(
                                            result.group,
                                            {
                                                name: selectedObject.name
                                            }
                                        )
                                        .then(() => {
                                            // noinspection UnnecessaryLocalVariableJS
                                            const oldName = selectedObject.name;
                                            if (result.group.name != null) {
                                                selectedObject.name = result.group.name;
                                                for (const group of this.allGroups) {
                                                    group.groupRenamed(oldName, result.group.name);
                                                }
                                            }
                                            if (result.group.displayName != null) {
                                                selectedObject.displayName = result.group.displayName;
                                            }
                                        })
                                        .catch((e: unknown) => {
                                            if (e instanceof HttpErrorResponse) {
                                                if (e.status as HttpStatusCode == HttpStatusCode.Conflict) {
                                                    this.snackBar.open(
                                                        'The group codename is already in use. Use a different one',
                                                        undefined,
                                                        {
                                                            duration: SNACKBAR_TIMEOUT
                                                        }
                                                    );
                                                    return;
                                                }
                                            }
                                            this.snackBar.open(
                                                'There has been an error while editing the group',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                        });
                                }
                            });
                    } else if (selectedObject instanceof Actuator) {
                        this.matDialog.open(
                            AddEntityDialogComponent,
                            {
                                data: {
                                    entityType:     EntityType.ACTUATOR,
                                    sonOfGroup:     this.selectedGroup?.name ?? null,
                                    groupNames:     this.allGroups.map(group => group.name),
                                    groupDisplays:  this.allGroups.map(group => group.displayName),
                                    forbiddenNames: this.allActuators.map(actuator => actuator.name),
                                    edit:           {
                                        displayName:   selectedObject.displayName,
                                        name:          selectedObject.name,
                                        zigbeeAddress: selectedObject.zigbeeAddress,
                                        actuatorType:  selectedObject.type,
                                        exposes: selectedObject.exposes.slice()
                                    }
                                }
                            }
                        )
                            .afterClosed()
                            .subscribe(result => {
                                if (result != null) {
                                    if (result.type != EntityType.ACTUATOR || !result.edit) {
                                        return;
                                    }
                                    this
                                        .deviceService
                                        .editActuator(
                                            result.actuator,
                                            {
                                                name: selectedObject.name
                                            }
                                        )
                                        .then(() => {
                                            const oldName: string = selectedObject.name;
                                            if (result.actuator.name != null) {
                                                selectedObject.name = result.actuator.name;
                                                for (const group of this.allGroups) {
                                                    group.actuatorRenamed(oldName, result.actuator.name);
                                                }
                                            }
                                            if (result.actuator.displayName != null) {
                                                selectedObject.displayName = result.actuator.displayName;
                                            }
                                            if (result.actuator.zigbeeAddress != null) {
                                                selectedObject.zigbeeAddress = result.actuator.zigbeeAddress;
                                            }
                                            if (result.actuator.type != null) {
                                                selectedObject.type = result.actuator.type;
                                            }
                                            if (result.actuator.exposes != null) {
                                                selectedObject.exposes.splice(0, Infinity);
                                                selectedObject.exposes.push(...result.actuator.exposes.map(ex => Datum.fromJSON(ex)));
                                            }
                                        })
                                        .catch((e: unknown) => {
                                            if (e instanceof HttpErrorResponse) {
                                                if (e.status as HttpStatusCode == HttpStatusCode.Conflict) {
                                                    this.snackBar.open(
                                                        'The actuator codename is already in use. Use a different one',
                                                        undefined,
                                                        {
                                                            duration: SNACKBAR_TIMEOUT
                                                        }
                                                    );
                                                    return;
                                                }
                                            }
                                            this.snackBar.open(
                                                'There has been an error while editing the actuator',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                        });
                                }
                            });
                    } else if (selectedObject instanceof Sensor) {
                        this.matDialog.open(
                            AddEntityDialogComponent,
                            {
                                data: {
                                    entityType:     EntityType.SENSOR,
                                    sonOfGroup:     this.selectedGroup?.name ?? null,
                                    groupNames:     this.allGroups.map(group => group.name),
                                    groupDisplays:  this.allGroups.map(group => group.displayName),
                                    forbiddenNames: this.allSensors.map(sensor => sensor.name),
                                    edit:           {
                                        displayName:   selectedObject.displayName,
                                        name:          selectedObject.name,
                                        zigbeeAddress: selectedObject.zigbeeAddress,
                                        sensorType:    selectedObject.type,
                                        exposes:       selectedObject.exposes.slice()
                                    }
                                }
                            }
                        )
                            .afterClosed()
                            .subscribe(result => {
                                if (result != null) {
                                    if (result.type != EntityType.SENSOR || !result.edit) {
                                        return;
                                    }
                                    this
                                        .deviceService
                                        .editSensor(
                                            result.sensor,
                                            {
                                                name: selectedObject.name
                                            }
                                        )
                                        .then(() => {
                                            const oldName: string = selectedObject.name;
                                            if (result.sensor.name != null) {
                                                selectedObject.name = result.sensor.name;
                                                for (const group of this.allGroups) {
                                                    group.sensorRenamed(oldName, result.sensor.name);
                                                }
                                            }
                                            if (result.sensor.displayName != null) {
                                                selectedObject.displayName = result.sensor.displayName;
                                            }
                                            if (result.sensor.zigbeeAddress != null) {
                                                selectedObject.zigbeeAddress = result.sensor.zigbeeAddress;
                                            }
                                            if (result.sensor.type != null) {
                                                selectedObject.type = result.sensor.type;
                                            }
                                            if (result.sensor.exposes != null) {
                                                selectedObject.exposes.splice(0, Infinity);
                                                selectedObject.exposes.push(...result.sensor.exposes.map(ex => Datum.fromJSON(ex)));
                                            }
                                        })
                                        .catch((e: unknown) => {
                                            if (e instanceof HttpErrorResponse) {
                                                if (e.status as HttpStatusCode == HttpStatusCode.Conflict) {
                                                    this.snackBar.open(
                                                        'The sensor codename is already in use. Use a different one',
                                                        undefined,
                                                        {
                                                            duration: SNACKBAR_TIMEOUT
                                                        }
                                                    );
                                                    return;
                                                }
                                            }
                                            this.snackBar.open(
                                                'There has been an error while editing the sensor',
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
                    let sonOfGroup: string | null;
                    if (selectedObject instanceof Group) {
                        const descendants = selectedObject.getAllDescendants(this.allGroups);
                        availableGroups   = this.allGroups.filter(group => !descendants.includes(group.name));
                        sonOfGroup        = this.allGroups.find(group => group.containsGroup(selectedObject.name))?.name ?? null;
                    } else if (selectedObject instanceof Actuator) {
                        availableGroups = this.allGroups;
                        sonOfGroup      = this.allGroups.find(group => group.containsActuator(selectedObject.name))?.name ?? null;
                    } else {
                        availableGroups = this.allGroups;
                        sonOfGroup      = this.allGroups.find(group => group.containsSensor(selectedObject.name))?.name ?? null;
                    }
                    this.matDialog.open(
                        ChangeGroupDialogComponent,
                        {
                            data: {
                                sonOfGroup,
                                groupNames:       availableGroups.map(group => group.name),
                                groupDisplays:    availableGroups.map(group => group.displayName),
                                toMove:           selectedObject.name,
                                movingEntityType: selectedObject instanceof Group ? EntityType.GROUP : (selectedObject instanceof Actuator ? EntityType.ACTUATOR : EntityType.SENSOR)
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
                                            this.updateTree();
                                        })
                                        .catch(() => {
                                            this.snackBar.open(
                                                'There has been an error while moving the group',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                        });
                                } else if (selectedObject instanceof Actuator) {
                                    this
                                        .deviceService
                                        .changeActuatorParent(
                                            {
                                                parent: newParentName
                                            },
                                            {
                                                name: selectedObject.name
                                            }
                                        )
                                        .then(() => {
                                            const oldParent = this.allGroups.find(group => group.containsActuator(selectedObject.name));
                                            if (oldParent != null) {
                                                oldParent.removeActuator(selectedObject.name);
                                            } else {
                                                const index = this.rootActuators.findIndex(actuator => actuator.name == selectedObject.name);
                                                if (index !== -1) {
                                                    this.rootActuators.splice(index, 1);
                                                }
                                            }
                                            const newParent = this.allGroups.find(group => group.name == newParentName);
                                            if (newParent != null) {
                                                newParent.addActuator(selectedObject.name);
                                            } else {
                                                this.rootActuators.push(selectedObject);
                                            }
                                            this.updateTree();
                                        })
                                        .catch(() => {
                                            this.snackBar.open(
                                                'There has been an error while moving the actuator',
                                                undefined,
                                                {
                                                    duration: SNACKBAR_TIMEOUT
                                                }
                                            );
                                        });
                                } else if (selectedObject instanceof Sensor) {
                                    this
                                        .deviceService
                                        .changeSensorParent(
                                            {
                                                parent: newParentName
                                            },
                                            {
                                                name: selectedObject.name
                                            }
                                        )
                                        .then(() => {
                                            const oldParent = this.allGroups.find(group => group.containsSensor(selectedObject.name));
                                            if (oldParent != null) {
                                                oldParent.removeSensor(selectedObject.name);
                                            } else {
                                                const index = this.rootSensors.findIndex(sensor => sensor.name == selectedObject.name);
                                                if (index !== -1) {
                                                    this.rootSensors.splice(index, 1);
                                                }
                                            }
                                            const newParent = this.allGroups.find(group => group.name == newParentName);
                                            if (newParent != null) {
                                                newParent.addSensor(selectedObject.name);
                                            } else {
                                                this.rootSensors.push(selectedObject);
                                            }
                                            this.updateTree();
                                        })
                                        .catch(() => {
                                            this.snackBar.open(
                                                'There has been an error while moving the sensor',
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

    protected get selectedGroup(): Group | null {
        if (this.selectedObject instanceof Group) {
            return this.selectedObject;
        } else {
            return null;
        }
    }

    private updateTree(): void {
        this.dataSource.data = this.rootGroups;
    }

    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

    protected getActuator: (name: string) => Actuator | null = (name: string): Actuator | null => { return this.allActuators.find(actuator => actuator.name == name) ?? null; };
    protected getSensor: (name: string) => Sensor | null     = (name: string): Sensor | null => { return this.allSensors.find(sensor => sensor.name == name) ?? null; };

    protected readonly ToolbarAction = ToolbarAction;
    protected readonly LoadingStatus = LoadingStatus;
    protected readonly Math          = Math;
}

enum ToolbarAction {
    DEVICES      = 'devices',
    MIXING       = 'mixing',
    SYSTEM       = 'system',
    DELETE       = 'delete',
    EDIT         = 'edit',
    MOVE         = 'move',
    ADD_GROUP    = 'add-group',
    ADD_ACTUATOR = 'add-actuator',
    ADD_SENSOR   = 'add-sensor'
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
        hint: 'Mixing view',
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
        icon:  'edit',
        id:    ToolbarAction.EDIT,
        hint:  'Edit',
        shortcut: {
            codes:      ['Enter', 'NumpadEnter'],
            osModifier: false,
            shift:      false,
            alt:        false
        },
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'move_item',
        id:    ToolbarAction.MOVE,
        hint:  'Move',
        shortcut: {
            codes:      ['KeyM'],
            osModifier: true,
            shift:      false,
            alt:        false
        },
        order: 3
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Remove',
        shortcut: {
            codes:      ['Delete', 'Backspace'],
            osModifier: false,
            shift:      false,
            alt:        false
        },
        order: 4
    },
    {
        type:    ToolBarElementType.BUTTON,
        icon:    'add',
        id:      'add',
        order:   5,
        hint:    'Add some new entity',
        submenu: [
            {
                type:  ToolBarElementType.BUTTON,
                icon:  'ad_group',
                id:    ToolbarAction.ADD_GROUP,
                hint:  'Create a new group',
                order:    0,
                shortcut: {
                    codes:      ['KeyI'],
                    osModifier: true,
                    shift:      false,
                    alt:        false
                }
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
                        order:    0,
                        shortcut: {
                            codes:      ['KeyI'],
                            osModifier: true,
                            shift:      true,
                            alt:        false
                        }
                    },
                    {
                        type:  ToolBarElementType.BUTTON,
                        icon:  'detector',
                        id:    ToolbarAction.ADD_SENSOR,
                        hint:  'Register a new sensor',
                        order:    2,
                        shortcut: {
                            codes:      ['KeyI'],
                            osModifier: true,
                            shift:      false,
                            alt:        true
                        }
                    }
                ]
            }
        ]
    }

];
