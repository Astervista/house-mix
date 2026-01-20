import {IsArray, IsNotEmpty, Matches} from "class-decorators";

export class Group {
    
    private readonly _actuators: string[] = [];
    private readonly _groups: string[] = [];
    
    constructor(
        public name: string,
        public displayName: string
    ) {
    }
    
    public get actuators(): readonly string[] {
        return this._actuators.slice();
    }
    
    public get groups(): readonly string[] {
        return this._groups.slice();
    }
    
    public get hasChildren(): boolean {
        // TODO: Add the option for the sensors
        return this._actuators.length > 0 || this._groups.length > 0;
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
    
    public containsActuator(actuator: string): boolean {
        return this._actuators.includes(actuator);
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
    
    public toJSON(): GroupJSON {
        return {
            name: this.name,
            displayName: this.displayName,
            actuators: this._actuators.slice(),
            groups: this._groups.slice()
        }
    }
    
    public static fromJSON(JSON: GroupJSON): Group {
        const group = new Group(JSON.name, JSON.displayName);
        group._actuators.push(...JSON.actuators);
        group._groups.push(...JSON.groups);
        return group;
    }

}


export class GroupJSON {
    
    @IsNotEmpty()
    @Matches(/^[a-z\-0-9_]+$/)
    public name: string;
    
    @IsNotEmpty()
    public displayName: string;
    
    @IsArray()
    @Matches(/^[a-z\-0-9_]+$/, { each: true})
    public actuators: string[] = [];
    
    @IsArray()
    @Matches(/^[a-z\-0-9_]+$/, { each: true})
    public groups: string[] = [];
    
    constructor(name: string, displayName: string) {
        this.name = name;
        this.displayName = displayName;
    }

}
