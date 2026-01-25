import {BadRequestException, ConflictException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException} from "@nestjs/common";
import {Group, GroupJSON} from "@common/devices/group/group";
import {FileService} from "../../helpers/file/file.service";
import {ActuatorService} from "../actuator/actuator.service";
import {DeleteGroupChildFate, DeleteGroupOptions, GetGroupsOptions, GroupEditChanges} from "@common/devices/group/rest-classes";
import {EntityType} from "@common/devices/constants";
import {Device} from "@common/devices/device";
import {SensorService} from "../sensor/sensor.service";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {MixPhase} from "@common/mixing/mix/rest-classes";
import MixService from "../../mixing/mix/mix.service";


const SAVE_FILE = "devices/group.json";

@Injectable()
export class GroupService extends PersistentDataService<GroupData, GroupDataJSON> {
    
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => ActuatorService))
        private actuatorService: ActuatorService,
        @Inject(forwardRef(() => SensorService))
        private sensorService: SensorService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService
    ) {
        super(fileService, SAVE_FILE, GroupData);
    }
    
    public async getAllGroups(options: GetGroupsOptions = {}): Promise<Group[]> {
        return (await this.data)
            .groups
            .filter(group => {
                if (options.actuatorMix !== undefined) {
                    if (group.actuatorMix !== options.actuatorMix) {
                        return false;
                    }
                }
                if (options.sensorMix !== undefined) {
                    if (group.sensorMix !== options.sensorMix) {
                        return false;
                    }
                }
                return true;
            });
    }
    
    public async getGroupByName(name: string): Promise<Group | null> {
        return (await this.data).groups.find(a => a.name === name) ?? null;
    }
    
    public async createGroup(group: Group, parentName: string | null): Promise<void> {
        if ((group.groups.length > 0) || (group.actuators.length > 0) || (group.sensors.length > 0)) {
            throw new BadRequestException(undefined, "A new group cannot be created already with children");
        }
        const data               = await this.data;
        const alreadyExisting    = data.groups.some(otherGroup => otherGroup.name === group.name);
        let parent: Group | null = null;
        if (parentName != null) {
            parent = data.groups.find(otherGroup => otherGroup.name === parentName) ?? null;
            if (parent == null) {
                throw new NotFoundException(undefined, "Parent group does not exist");
            }
        }
        if (!alreadyExisting) {
            data.groups.push(group);
            if (parent != null) {
                parent.addGroup(group.name);
            }
            this.saveData();
        } else {
            throw new ConflictException();
        }
    }
    
    public async editGroup(oldName: string, edit: GroupEditChanges): Promise<void> {
        const data        = await this.data;
        const newName     = edit.name;
        const groupToEdit = data.groups.find(otherGroup => otherGroup.name === oldName);
        if (groupToEdit == null) {
            throw new NotFoundException();
        }
        let alreadyExisting = false;
        if (oldName !== newName) {
            alreadyExisting = data.groups.some(otherGroup => otherGroup.name === edit.name);
        }
        if (!alreadyExisting) {
            if ((newName != null) && (oldName != newName)) {
                groupToEdit.name = newName;
                data.groups.forEach(otherGroup => {
                    otherGroup.groupRenamed(oldName, newName);
                });
            }
            if (edit.displayName != null) {
                groupToEdit.displayName = edit.displayName;
            }
            this.saveData();
        } else {
            throw new ConflictException();
        }
    }
    
    public async deleteGroup(
        name: string,
        options: DeleteGroupOptions
    ): Promise<void> {
        const data          = await this.data;
        const groupToDelete = data.groups.find(otherGroup => otherGroup.name === name);
        if (groupToDelete == null) {
            throw new NotFoundException();
        }
        let destinationGroup: Group | null = null;
        if (groupToDelete.hasChildren) {
            switch (options.fate) {
                case DeleteGroupChildFate.CURRENT_LEVEL: {
                    const parentGroup = data.groups.find(group => group.containsGroup(name));
                    if (parentGroup != null) {
                        destinationGroup = parentGroup;
                    }
                    break;
                }
                case DeleteGroupChildFate.CHOOSE_WHERE: {
                    destinationGroup = data.groups.find(group => group.name === options.parent) ?? null;
                    if (destinationGroup == null) {
                        throw new NotFoundException(undefined, "Destination group does not exist");
                    }
                    break;
                }
                case null:
                case DeleteGroupChildFate.ROOT_LEVEL: {
                    destinationGroup = null;
                    break;
                }
            }
        }
        if (destinationGroup != null) {
            const children = groupToDelete.getAllDescendants(data.groups);
            if (children.includes(destinationGroup.name)) {
                throw new BadRequestException(undefined, "Cannot move a group into one of its own descendants");
            }
            groupToDelete.groups.forEach(group => { destinationGroup.addGroup(group);});
            groupToDelete.actuators.forEach(actuator => { destinationGroup.addActuator(actuator);});
            groupToDelete.sensors.forEach(sensor => { destinationGroup.addSensor(sensor);});
        }
        const toDeleteIndex = data.groups.findIndex(otherGroup => otherGroup.name === name);
        if (toDeleteIndex !== -1) {
            data.groups.splice(toDeleteIndex, 1);
        }
        const parentGroup = data.groups.find(group => group.containsGroup(name));
        if (parentGroup != null) {
            parentGroup.removeGroup(name);
        }
        this.saveData();
    }
    
    public async changeParent(entityToMove: string, newParentName: string | null, entityType: EntityType): Promise<void> {
        const data = await this.data;
        let elementToMove: Group | Device | null;
        switch (entityType) {
            case EntityType.GROUP: {
                elementToMove = data.groups.find(otherGroup => otherGroup.name === entityToMove) ?? null;
                break;
            }
            case EntityType.ACTUATOR: {
                elementToMove = await this.actuatorService.getActuatorByName(entityToMove);
                break;
            }
            case EntityType.SENSOR: {
                elementToMove = await this.sensorService.getSensorByName(entityToMove);
                break;
            }
        }
        if (elementToMove == null) {
            throw new NotFoundException("Could not find requested element");
        }
        let newParent: Group | null = null;
        if (newParentName != null) {
            newParent = data.groups.find(otherGroup => otherGroup.name === newParentName) ?? null;
            if (newParent == null) {
                throw new NotFoundException(undefined, "New parent group does not exist");
            }
            if ((entityType == EntityType.GROUP) && (elementToMove instanceof Group)) {
                const descendants = elementToMove.getAllDescendants(data.groups);
                if (descendants.includes(newParentName)) {
                    throw new BadRequestException(undefined, "Cannot move a group into one of its own descendants");
                }
            }
        }
        // TODO: This probably requires checking for mixes using parent's results, that all get messed up
        const oldParent = data.groups.find(otherGroup => otherGroup.containsActuator(entityToMove));
        if (oldParent != null) {
            switch (entityType) {
                case EntityType.GROUP:
                    oldParent.removeGroup(entityToMove);
                    break;
                case EntityType.ACTUATOR:
                    oldParent.removeActuator(entityToMove);
                    break;
                case EntityType.SENSOR:
                    oldParent.removeSensor(entityToMove);
                    break;
                
            }
        }
        if (newParent != null) {
            switch (entityType) {
                case EntityType.GROUP:
                    newParent.addGroup(entityToMove);
                    break;
                case EntityType.ACTUATOR:
                    newParent.addActuator(entityToMove);
                    break;
                case EntityType.SENSOR:
                    newParent.addSensor(entityToMove);
                    break;
            }
        }
        this.saveData();
    }
    
    public async addDevice(groupName: string, deviceName: string, entityType: EntityType, move: boolean, mustExist: boolean = true): Promise<void> {
        if (entityType == EntityType.GROUP) {
            throw new InternalServerErrorException();
        }
        const data = await this.data;
        let containingGroup: Group | null;
        if (entityType == EntityType.ACTUATOR) {
            containingGroup = data.groups.find(otherGroup => otherGroup.containsActuator(deviceName)) ?? null;
        } else {
            containingGroup = data.groups.find(otherGroup => otherGroup.containsSensor(deviceName)) ?? null;
        }
        const targetGroup = data.groups.find(otherGroup => otherGroup.name == groupName);
        if (targetGroup == null) {
            throw new NotFoundException(undefined, "Target group does not exist");
        }
        if (mustExist) {
            let deviceExists: boolean;
            if (entityType == EntityType.ACTUATOR) {
                deviceExists = await this.actuatorService.actuatorExists(deviceName);
            } else {
                deviceExists = await this.sensorService.sensorExists(deviceName);
            }
            if (!deviceExists) {
                throw new NotFoundException(undefined, "Actuator does not exist");
            }
        }
        if (containingGroup?.name === groupName) {
            return;
        }
        if (!move && containingGroup != null) {
            throw new ConflictException(undefined, "The device is already in another group");
        }
        if (entityType == EntityType.ACTUATOR) {
            if (containingGroup != null) {
                containingGroup.removeActuator(deviceName);
            }
            targetGroup.addActuator(deviceName);
        } else {
            if (containingGroup != null) {
                containingGroup.removeSensor(deviceName);
            }
            targetGroup.addSensor(deviceName);
        }
        this.saveData();
    }
    
    public async removeDevice(name: string, entityType: EntityType): Promise<void> {
        const data                         = await this.data;
        let elementToRemove: Device | null = null;
        if (entityType == EntityType.ACTUATOR) {
            elementToRemove = await this.actuatorService.getActuatorByName(name);
        } else if (entityType == EntityType.SENSOR) {
            elementToRemove = await this.sensorService.getSensorByName(name);
        }
        if (elementToRemove == null) {
            throw new NotFoundException();
        }
        if (entityType == EntityType.ACTUATOR) {
            const containingGroup = data.groups.find(otherGroup => otherGroup.containsActuator(name));
            if (containingGroup != null) {
                containingGroup.removeActuator(name);
            }
            await this.actuatorService.deleteActuator(name);
        } else if (entityType == EntityType.SENSOR) {
            const containingGroup = data.groups.find(otherGroup => otherGroup.containsSensor(name));
            if (containingGroup != null) {
                containingGroup.removeSensor(name);
            }
            await this.sensorService.deleteSensor(name);
        }
        this.saveData();
    }
    
    public async actuatorRenamed(oldName: string, newName: string): Promise<void> {
        const data = await this.data;
        data.groups.forEach(group => { group.actuatorRenamed(oldName, newName); });
        this.saveData();
    }
    
    public async sensorRenamed(oldName: string, newName: string): Promise<void> {
        const data = await this.data;
        data.groups.forEach(group => { group.sensorRenamed(oldName, newName); });
        this.saveData();
    }
    
    public async setMixForGroup(groupName: string, mixId: number | "NEW", phase: MixPhase.ACTUATORS | MixPhase.SENSORS): Promise<void> {
        
        if (mixId == "NEW") {
            throw new BadRequestException("Cannot assign a new mix directly");
        }
        const group = await this.getGroupByName(groupName);
        if (group == null) {
            throw new NotFoundException(`Cannot find group "${groupName}"`);
        } else {
            if (await this.mixService.getMixById(mixId) == null) {
                throw new NotFoundException(`Cannot find mix with id ${mixId}`);
            }
        }
        if (phase == MixPhase.SENSORS) {
            group.sensorMix = mixId;
        } else {
            group.actuatorMix = mixId
        }
        this.saveData();
    }
}

class GroupData {
    
    public groups: Group[];
    
    constructor(groupDataJSON?: GroupDataJSON) {
        if (groupDataJSON) {
            this.groups = groupDataJSON.groups.map((groupJSON: GroupJSON) => Group.fromJSON(groupJSON));
        } else {
            this.groups = [];
        }
    }
    
    public toJSON(): GroupDataJSON {
        return {
            groups: this.groups.map((group: Group) => group.toJSON())
        };
    }
    
}

interface GroupDataJSON {
    groups: GroupJSON[];
}

