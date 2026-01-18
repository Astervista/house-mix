import {IsArray, IsNotEmpty, Matches, Validate, ValidateNested} from "class-validator";

export class Group {
    
    private readonly _name: string;
    
    private readonly _actuators: string[] = [];
    
    constructor(name: string, public displayName: string) {
        this._name = name;
    }
    
    public get name(): string {
        return this._name;
    }
    
    public get actuators(): readonly string[] {
        return this._actuators.slice();
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
    
    public toJSON(): GroupJSON {
        return {
            name: this.name,
            displayName: this.displayName,
            actuators: this._actuators.slice()
        }
    }
    
    public static fromJSON(JSON: GroupJSON): Group {
        return new Group(JSON.name, JSON.displayName);
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
    
    constructor(name: string, displayName: string) {
        this.name = name;
        this.displayName = displayName;
    }

}
