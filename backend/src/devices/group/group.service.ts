import {BadRequestException, ConflictException, Injectable, NotFoundException} from "@nestjs/common";
import {Group, GroupJSON} from "@common/devices/group/group";
import {FileService} from "../../helpers/file/file.service";
import {ActuatorService} from "../actuator/actuator.service";
import {DeleteGroupChildFate, DeleteGroupOptions, GroupEditChanges} from "@common/devices/group/rest-classes";

const SAVE_FILE = "devices/group.json";
@Injectable()
export class GroupService {
    private readonly groupData: Promise<GroupData>;
    
    constructor(
        private fileService: FileService,
        private actuatorService: ActuatorService
    ) {
        this.groupData = fileService
            .readDataFile<GroupDataJSON>(SAVE_FILE)
            .then((data: GroupDataJSON | null) => {
                if (data != null) {
                    return new GroupData(data);
                } else {
                    return new GroupData();
                }
            });
    }
    
    private saveData(data: GroupData): void {
        void this.fileService.saveDataFile(SAVE_FILE, data.toJSON());
    }
    
    public async getAllGroups(): Promise<Group[]> {
        return (await this.groupData).groups.slice();
    }
    
    public async getGroupByName(name: string): Promise<Group | null> {
        return (await this.groupData).groups.find(a => a.name === name) ?? null;
    }
    
    public async createGroup(group: Group, parentName: string | null): Promise<void> {
        if ((group.groups.length > 0) || (group.actuators.length > 0)) {
            // TODO: put sensors when added
            throw new BadRequestException(undefined, "A new group cannot be created already with children");
        }
        const data = await this.groupData;
        const alreadyExisting = data.groups.some(otherGroup => otherGroup.name === group.name);
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
            this.saveData(data);
        } else {
            throw new ConflictException();
        }
    }
    
    public async editGroup(oldName: string, edit: GroupEditChanges): Promise<void> {
        const data = await this.groupData;
        const newName = edit.name;
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
                })
            }
            if (edit.displayName != null) {
                groupToEdit.displayName = edit.displayName;
            }
            this.saveData(data);
        } else {
            throw new ConflictException();
        }
    }
    
    public async deleteGroup(
        name: string,
        options: DeleteGroupOptions
    ): Promise<void> {
        const data = await this.groupData;
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
            groupToDelete.groups.forEach(group => { destinationGroup.addGroup(group)})
            groupToDelete.actuators.forEach(actuator => { destinationGroup.addActuator(actuator)})
            // TODO: other possibilities
        }
        const toDeleteIndex = data.groups.findIndex(otherGroup => otherGroup.name === name);
        if (toDeleteIndex !== -1) {
            data.groups.splice(toDeleteIndex, 1);
        }
        const parentGroup = data.groups.find(group => group.containsGroup(name));
        if (parentGroup != null) {
            parentGroup.removeGroup(name);
        }
        this.saveData(data);
    }
    
    public async changeParent(groupToMoveName: string, newParentName: string | null): Promise<void> {
        const data = await this.groupData;
        const groupToMove = data.groups.find(otherGroup => otherGroup.name === groupToMoveName);
        if (groupToMove == null) {
            throw new NotFoundException();
        }
        let newParent: Group | null = null;
        if (newParentName != null) {
            newParent = data.groups.find(otherGroup => otherGroup.name === newParentName) ?? null;
            if (newParent == null) {
                throw new NotFoundException(undefined, "New parent group does not exist");
            }
            const descendants = groupToMove.getAllDescendants(data.groups);
            if (descendants.includes(groupToMoveName)) {
                throw new BadRequestException(undefined, "Cannot move a group into one of its own descendants");
            }
        }
        const oldParent = data.groups.find(otherGroup => otherGroup.containsGroup(groupToMoveName));
        if (oldParent != null) {
            oldParent.removeGroup(groupToMoveName);
        }
        if (newParent != null) {
            newParent.addGroup(groupToMoveName);
        }
        this.saveData(data);
    }
    
    public async addActuator(name: string, actuatorName: string, move: boolean): Promise<void> {
        const data = await this.groupData;
        const containingGroup = data.groups.find(otherGroup => otherGroup.containsActuator(actuatorName));
        const targetGroup = data.groups.find(otherGroup => otherGroup.name == name);
        const actuatorExists = await this.actuatorService.actuatorExists(actuatorName);
        if (targetGroup == null) {
            throw new NotFoundException(undefined, "Target group does not exist");
        }
        if (!actuatorExists) {
            throw new NotFoundException(undefined, "Actuator does not exist");
        }
        if (containingGroup?.name === name) {
            return;
        }
        if (!move && containingGroup != null) {
            throw new ConflictException(undefined, "The actuator is already in another group");
        }
        if (containingGroup != null) {
            containingGroup.removeActuator(actuatorName);
        }
        targetGroup.addActuator(actuatorName);
        this.saveData(data);
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
            groups: this.groups.map((group: Group) => group.toJSON()),
        }
    }
    
}

interface GroupDataJSON {
    groups: GroupJSON[];
}

