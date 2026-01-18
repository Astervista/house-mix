import {ConflictException, Injectable, NotFoundException} from "@nestjs/common";
import {Group, GroupJSON} from "@common/devices/group/group";
import {FileService} from "../../helpers/file/file.service";
import {ActuatorService} from "../actuator/actuator.service";

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
    
    public async createGroup(group: Group): Promise<void> {
        const data = await this.groupData;
        const alreadyExisting = data.groups.some(otherGroup => otherGroup.name === group.name);
        if (!alreadyExisting) {
            data.groups.push(group);
            this.saveData(data);
        } else {
            throw new ConflictException();
        }
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

