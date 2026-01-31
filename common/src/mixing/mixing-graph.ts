import {DatumOrigin} from "./mix/datum";
import {SensorType} from "../devices/sensor/sensor";
import {ActuatorType} from "../devices/actuator/actuator";
import {IsArray, IsBoolean, IsDefined, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min, Type, ValidateNested} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../utils/constants";

export class MixingGraph {
    
    public origins: DatumOrigin[] = [];
    
    public sensors: MixingGraphSensor[] = [];
    
    public sensorGroups: MixingGraphGroup[] = [];
    
    public centers: MixingGraphCenter[] = [];
    
    public actuatorGroups: MixingGraphGroup[] = [];
    
    public actuators: MixingGraphActuator[] = [];
    
    public addOrigin(origin: DatumOrigin): void {
        if (!this.origins.includes(origin)) {
            this.origins.push(origin);
        }
    }
    
    public toJSON(): MixingGraphJSON {
        return {
            origins:        this.origins.slice(),
            sensors:        this.sensors.map(sensor => sensor.toJSON()),
            sensorGroups:        this.sensorGroups.map(group => group.toJSON()),
            centers: this.centers.map(center => center.toJSON()),
            actuatorGroups:        this.actuatorGroups.map(group => group.toJSON()),
            actuators:        this.actuators.map(actuator => actuator.toJSON())
        }
    }
    
    public static fromJSON(json: MixingGraphJSON): MixingGraph {
        const graph = new MixingGraph();
        graph.origins = json.origins.slice();
        graph.sensors = json.sensors.map(sensor => MixingGraphSensor.fromJSON(sensor));
        graph.sensorGroups = json.sensorGroups.map(group => MixingGraphGroup.fromJSON(group));
        graph.centers = json.centers.map(center => MixingGraphCenter.fromJSON(center));
        graph.actuatorGroups = json.actuatorGroups.map(group => MixingGraphGroup.fromJSON(group));
        graph.actuators = json.actuators.map(actuator => MixingGraphActuator.fromJSON(actuator))
        return graph;
    }
    
}

export class MixingGraphDependency {
    
    constructor(public origin: DatumOrigin, public name?: string) {}
    
    public toJSON(): MixingGraphDependencyJSON {
        return {
            origin: this.origin,
            name:   this.name
        };
    }
    
    public static fromJSON(json: MixingGraphDependencyJSON): MixingGraphDependency {
        return new MixingGraphDependency(json.origin, json.name);
    }
    
}

export class MixingGraphSensor {
    
    public dependingOn: MixingGraphDependency[] = [];
    
    constructor(
        public name: string,
        public displayName: string,
        public type: SensorType,
        public mix: number
    ) {
    
    }
    
    public toJSON(): MixingGraphSensorJSON {
        return {
            name:        this.name,
            displayName: this.displayName,
            type:        this.type,
            dependingOn: this.dependingOn.map(dependency => dependency.toJSON()),
            mix: this.mix
        }
    }
    
    public static fromJSON(mixingGraphSensorJSON: MixingGraphSensorJSON): MixingGraphSensor {
        const mixingGraphSensor = new MixingGraphSensor(
            mixingGraphSensorJSON.name,
            mixingGraphSensorJSON.displayName,
            mixingGraphSensorJSON.type,
            mixingGraphSensorJSON.mix
        )
        mixingGraphSensor.dependingOn = mixingGraphSensorJSON.dependingOn.map(dependency => MixingGraphDependency.fromJSON(dependency))
        return mixingGraphSensor;
    }
}


export class MixingGraphCenter {
    
    public dependingOn: MixingGraphDependency[] = [];
    
    constructor(
        public name: string,
        public displayName: string,
        public mix: number
    ) {
    
    }
    
    public toJSON(): MixingGraphCenterJSON {
        return {
            name:        this.name,
            displayName: this.displayName,
            dependingOn: this.dependingOn.map(dependency => dependency.toJSON()),
            mix: this.mix
        }
    }
    
    public static fromJSON(mixingGraphCenterJSON: MixingGraphCenterJSON): MixingGraphCenter {
        const mixingGraphSensor = new MixingGraphCenter(
            mixingGraphCenterJSON.name,
            mixingGraphCenterJSON.displayName,
            mixingGraphCenterJSON.mix
        )
        mixingGraphSensor.dependingOn = mixingGraphCenterJSON.dependingOn.map(dependency => MixingGraphDependency.fromJSON(dependency))
        return mixingGraphSensor;
    }
}

export class MixingGraphGroup {
    
    public dependingOn: MixingGraphDependency[] = [];
    
    constructor(
        public name: string,
        public displayName: string,
        public sensorPhase: boolean,
        public mix: number
    ) {
    
    }
    
    public toJSON(): MixingGraphGroupJSON {
        return {
            name:        this.name,
            displayName: this.displayName,
            dependingOn: this.dependingOn.map(dependency => dependency.toJSON()),
            sensorPhase: this.sensorPhase,
            mix: this.mix
        }
    }
    
    public static fromJSON(mixingGraphGroupJSON: MixingGraphGroupJSON): MixingGraphGroup {
        const mixingGraphGroup = new MixingGraphGroup(
            mixingGraphGroupJSON.name,
            mixingGraphGroupJSON.displayName,
            mixingGraphGroupJSON.sensorPhase,
            mixingGraphGroupJSON.mix
        );
        mixingGraphGroup.dependingOn = mixingGraphGroupJSON.dependingOn.map(dependency => MixingGraphDependency.fromJSON(dependency));
        return mixingGraphGroup
    }
}

export class MixingGraphActuator {
    
    public dependingOn: MixingGraphDependency[] = [];
    
    constructor(
        public name: string,
        public displayName: string,
        public type: ActuatorType,
        public mix: number
    ) {
    }
    
    public toJSON(): MixingGraphActuatorJSON {
        return {
            name:        this.name,
            displayName: this.displayName,
            type:        this.type,
            dependingOn: this.dependingOn.map(dependency => dependency.toJSON()),
            mix: this.mix
        }
    }
    
    public static fromJSON(mixingGraphActuatorJSON: MixingGraphActuatorJSON): MixingGraphActuator {
        const mixingGraphActuator = new MixingGraphActuator(
            mixingGraphActuatorJSON.name,
            mixingGraphActuatorJSON.displayName,
            mixingGraphActuatorJSON.type,
            mixingGraphActuatorJSON.mix
        );
        mixingGraphActuator.dependingOn = mixingGraphActuatorJSON.dependingOn.map(dependency => MixingGraphDependency.fromJSON(dependency))
        return mixingGraphActuator
    }
    
}

export class MixingGraphJSON {
    
    @IsArray()
    @IsEnum(DatumOrigin)
    public origins: DatumOrigin[] = [];
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphSensorJSON)
    public sensors: MixingGraphSensorJSON[] = [];
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphGroupJSON)
    public sensorGroups: MixingGraphGroupJSON[] = [];
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphCenterJSON)
    public centers: MixingGraphCenterJSON[] = [];
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphGroupJSON)
    public actuatorGroups: MixingGraphGroupJSON[] = [];
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphActuatorJSON)
    public actuators: MixingGraphActuatorJSON[] = [];

}

export class MixingGraphDependencyJSON {
    
    @IsEnum(DatumOrigin)
    public origin: DatumOrigin;
    
    @IsOptional()
    @IsString()
    public name?: string;
    
    constructor(origin: DatumOrigin, name?: string) {
        this.origin = origin;
        this.name   = name;
    }
    
}

export class MixingGraphSensorJSON {
    
    
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    @IsNotEmpty()
    public displayName: string;
    
    @IsEnum(SensorType)
    public type: SensorType;
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphDependencyJSON)
    public dependingOn: MixingGraphDependencyJSON[];
    
    @IsDefined()
    @Min(0)
    @IsInt()
    public mix: number;
    
    constructor(
        name: string,
        displayName: string,
        type: SensorType,
        dependingOn: MixingGraphDependencyJSON[],
        mix: number
    ) {
        this.name = name;
        this.displayName = displayName;
        this.type = type;
        this.dependingOn = dependingOn;
        this.mix = mix;
    }
}


export class MixingGraphCenterJSON {
    
    
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    @IsNotEmpty()
    public displayName: string;
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphDependencyJSON)
    public dependingOn: MixingGraphDependencyJSON[];
    
    @IsDefined()
    @Min(0)
    @IsInt()
    public mix: number;
    
    constructor(
        name: string,
        displayName: string,
        dependingOn: MixingGraphDependencyJSON[],
        mix: number
    ) {
        this.name = name;
        this.displayName = displayName;
        this.dependingOn = dependingOn;
        this.mix = mix;
    }
}

export class MixingGraphGroupJSON {
    
    
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    @IsNotEmpty()
    public displayName: string;
    
    @IsBoolean()
    public sensorPhase: boolean;
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphDependencyJSON)
    public dependingOn: MixingGraphDependencyJSON[];
    
    @IsDefined()
    @Min(0)
    @IsInt()
    public mix: number;
    
    constructor(
        name: string,
        displayName: string,
        sensorPhase: boolean,
        dependingOn: MixingGraphDependencyJSON[],
        mix: number
    ) {
        this.name = name;
        this.displayName = displayName;
        this.sensorPhase = sensorPhase;
        this.dependingOn = dependingOn;
        this.mix = mix;
    }
}

export class MixingGraphActuatorJSON {
    
    
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    @IsNotEmpty()
    public displayName: string;
    
    @IsEnum(ActuatorType)
    public type: ActuatorType;
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphDependencyJSON)
    public dependingOn: MixingGraphDependencyJSON[];
    
    @IsDefined()
    @Min(0)
    @IsInt()
    public mix: number;
    
    constructor(
        name: string,
        displayName: string,
        type: ActuatorType,
        dependingOn: MixingGraphDependencyJSON[],
        mix: number
    ) {
        this.name = name;
        this.displayName = displayName;
        this.type = type;
        this.dependingOn = dependingOn;
        this.mix = mix;
    }
}
