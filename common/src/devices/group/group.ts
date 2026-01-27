import {IsArray, IsNotEmpty, Matches, IsInt, IsPositive, ValidateIf, Min} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";

export class Group {
    
    private readonly _groups: string[] = [];
    private readonly _actuators: string[] = [];
    private readonly _sensors: string[] = [];
    public sensorMix: number | null = null;
    public actuatorMix: number | null = null;
    
    constructor(
        public name: string,
        public displayName: string,
    ) {
    }
    
    public get actuators(): readonly string[] {
        return this._actuators.slice();
    }
    
    public get sensors(): readonly string[] {
        return this._sensors.slice();
    }
    
    public get groups(): readonly string[] {
        return this._groups.slice();
    }
    
    public get hasChildren(): boolean {
        return this._actuators.length > 0 || this._groups.length > 0 || this._sensors.length > 0;
    }
    
    public getAllDescendants(groups: readonly Group[]): string[] {
        const children: string[]        = [];
        const checkingChildren: Group[] = [this];
        while (checkingChildren.length > 0) {
            const checkGroup = checkingChildren.pop();
            if (checkGroup != null) {
                children.push(checkGroup.name);
                const childrenNames = checkGroup.groups;
                checkingChildren.push(...groups.filter(otherGroup => childrenNames.includes(otherGroup.name)));
            }
        }
        return children;
    }
    
    public addGroup(group: string): void {
        this._groups.push(group);
    }
    
    public removeGroup(group: string): boolean {
        const index = this._groups.indexOf(group);
        if (index > -1) {
            this._groups.splice(index, 1);
            return true;
        } else {
            return false;
        }
    }
    
    public containsGroup(group: string): boolean {
        return this._groups.includes(group);
    }
    
    public groupRenamed(oldName: string, newName: string): void {
        if (this.containsGroup(oldName)) {
            this.removeGroup(oldName);
            this.addGroup(newName);
        }
    }
    
    public addActuator(actuator: string): void {
        this._actuators.push(actuator);
    }
    
    public removeActuator(actuator: string): boolean {
        const index = this._actuators.indexOf(actuator);
        if (index > -1) {
            this._actuators.splice(index, 1);
            return true;
        } else {
            return false;
        }
    }
    
    public containsActuator(actuator: string): boolean {
        return this._actuators.includes(actuator);
    }
    
    public actuatorRenamed(oldName: string, newName: string): void {
        if (this.containsActuator(oldName)) {
            this.removeActuator(oldName);
            this.addActuator(newName);
        }
    }
    
    public addSensor(sensor: string): void {
        this._sensors.push(sensor);
    }
    
    public removeSensor(sensor: string): boolean {
        const index = this._sensors.indexOf(sensor);
        if (index > -1) {
            this._sensors.splice(index, 1);
            return true;
        } else {
            return false;
        }
    }
    
    public containsSensor(sensor: string): boolean {
        return this._sensors.includes(sensor);
    }
    
    public sensorRenamed(oldName: string, newName: string): void {
        if (this.containsSensor(oldName)) {
            this.removeSensor(oldName);
            this.addSensor(newName);
        }
    }
    
    public toJSON(): GroupJSON {
        return {
            name: this.name,
            displayName: this.displayName,
            groups: this._groups.slice(),
            actuators: this._actuators.slice(),
            sensors: this._sensors.slice(),
            sensorMix: this.sensorMix,
            actuatorMix: this.actuatorMix
        }
    }
    
    public static fromJSON(JSON: GroupJSON): Group {
        const group = new Group(JSON.name, JSON.displayName);
        group._groups.push(...new Set(JSON.groups));
        group._actuators.push(...new Set(JSON.actuators));
        group._sensors.push(...new Set(JSON.sensors));
        group.sensorMix = JSON.sensorMix;
        group.actuatorMix = JSON.actuatorMix;
        return group;
    }
}


export class GroupJSON {
    
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    @IsNotEmpty()
    public displayName: string;
    
    @IsArray()
    @Matches(UNIQUE_NAME_PATTERN, { each: true})
    public groups: string[] = [];
    
    @IsArray()
    @Matches(UNIQUE_NAME_PATTERN, { each: true})
    public actuators: string[] = [];
    
    @IsArray()
    @Matches(UNIQUE_NAME_PATTERN, { each: true})
    public sensors: string[] = [];
    
    @ValidateIf((o: GroupJSON) => o.sensorMix !== null)
    @IsInt()
    @Min(0)
    public sensorMix: number | null = null;
    
    @ValidateIf((o: GroupJSON) => o.actuatorMix !== null)
    @IsInt()
    @Min(0)
    public actuatorMix: number | null = null;
    
    constructor(name: string, displayName: string) {
        this.name = name;
        this.displayName = displayName;
    }

}
