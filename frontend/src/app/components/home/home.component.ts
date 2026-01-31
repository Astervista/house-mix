import {Component} from '@angular/core';
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
import {DeleteGroupDialogComponent} from '../dialogs/delete-group-dialog/delete-group-dialog.component';
import {DeleteGroupChildFate} from '@common/devices/group/rest-classes';
import {DeviceService} from '../../services/device.service';
import {DeviceComponent} from '../entities/devices/device/device.component';
import {ConfirmDialogComponent} from '../dialogs/confirm-dialog/confirm-dialog.component';
import {MatIcon} from '@angular/material/icon';
import {BetterMatDialog} from '../../utils/better-mat-dialog';


@Component({
               selector:    'house-mix-home',
               imports:     [
                   ToolbarComponent,
                   GroupComponent,
                   DeviceComponent,
                   MatIcon
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

    constructor(
        private router: Router,
        private matDialog: BetterMatDialog,
        private groupService: GroupService,
        private deviceService: DeviceService,
        private snackbar: MatSnackBar
    ) {
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
                                    })
                                    .catch((e: unknown) => {
                                        if (e instanceof HttpErrorResponse) {
                                            if (e.status as HttpStatusCode == HttpStatusCode.Conflict) {
                                                this.snackbar.open(
                                                    'The actuator codename is already in use. Create an actuator with a different one',
                                                    undefined,
                                                    {
                                                        duration: SNACKBAR_TIMEOUT
                                                    }
                                                );
                                                return;
                                            }
                                        }
                                        this.snackbar.open(
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
                                    })
                                    .catch((e: unknown) => {
                                        if (e instanceof HttpErrorResponse) {
                                            if (e.status as HttpStatusCode == HttpStatusCode.Conflict) {
                                                this.snackbar.open(
                                                    'The sensor codename is already in use. Create an sensor with a different one',
                                                    undefined,
                                                    {
                                                        duration: SNACKBAR_TIMEOUT
                                                    }
                                                );
                                                return;
                                            }
                                        }
                                        this.snackbar.open(
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
                    } else if (selectedObject instanceof Actuator) {

                        this.matDialog.open(
                            ConfirmDialogComponent,
                            {
                                data: {
                                    title:       'Delete actuator',
                                    message:     `Are you sure you want to delete the actuator "${selectedObject.displayName}"?`,
                                    confirmText: 'Delete',
                                    warn:        true
                                }
                            }
                        )
                            .afterClosed()
                            .subscribe(result => {
                                if (result != null) {
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
                    } else if (selectedObject instanceof Sensor) {

                        this.matDialog.open(
                            ConfirmDialogComponent,
                            {
                                data: {
                                    title:       'Delete sensor',
                                    message:     `Are you sure you want to delete the sensor "${selectedObject.displayName}"?`,
                                    confirmText: 'Delete',
                                    warn:        true
                                }
                            }
                        )
                            .afterClosed()
                            .subscribe(result => {
                                if (result != null) {
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
                                                    this.snackbar.open(
                                                        'The group codename is already in use. Use a different one',
                                                        undefined,
                                                        {
                                                            duration: SNACKBAR_TIMEOUT
                                                        }
                                                    );
                                                    return;
                                                }
                                            }
                                            this.snackbar.open(
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
                                        exposes:       selectedObject.exposes
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
                                                    this.snackbar.open(
                                                        'The actuator codename is already in use. Use a different one',
                                                        undefined,
                                                        {
                                                            duration: SNACKBAR_TIMEOUT
                                                        }
                                                    );
                                                    return;
                                                }
                                            }
                                            this.snackbar.open(
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
                                        exposes:       selectedObject.exposes
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
                                                    this.snackbar.open(
                                                        'The sensor codename is already in use. Use a different one',
                                                        undefined,
                                                        {
                                                            duration: SNACKBAR_TIMEOUT
                                                        }
                                                    );
                                                    return;
                                                }
                                            }
                                            this.snackbar.open(
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
                    if (selectedObject instanceof Group) {
                        const descendants = selectedObject.getAllDescendants(this.allGroups);
                        availableGroups   = this.allGroups.filter(group => !descendants.includes(group.name));
                    } else {
                        availableGroups = this.allGroups;
                    }
                    this.matDialog.open(
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

    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

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
        icon:  'edit',
        id:    ToolbarAction.EDIT,
        hint:  'Edit',
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'move_item',
        id:    ToolbarAction.MOVE,
        hint:  'Move',
        order: 3
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Remove',
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
