/**
 * This module contains {@link MixingGraph|`MixingGraph`} and the related classes.
 *
 * @module
 */
// noinspection ES6UnusedImports
import type {Datum} from "./mix/datum";
import {DatumOrigin} from "./mix/datum";
// noinspection ES6UnusedImports
import type {Sensor} from "../devices/sensor/sensor";
import {SensorType} from "../devices/sensor/sensor";
// noinspection ES6UnusedImports
import type {Actuator} from "../devices/actuator/actuator";
import {ActuatorType} from "../devices/actuator/actuator";
import {IsArray, IsBoolean, IsDefined, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min, Type, ValidateNested} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../utils/constants";

// noinspection ES6UnusedImports
import type {Mix} from "./mix/mix";
// noinspection ES6UnusedImports
import type {Group} from "../devices/group/group";

/**
 * This is a class that holds a graph of all the system's {@link Mix|`Mix`es}, their dependencies and their arrangement in the system calculation cycle.
 *
 * The system calculation cycle is the routinely run re-calculation of the system and develops in a specific order: first, data is gathered from the system
 * and the sensors, then all the mixes related to a {@link Sensor#mix|`Sensor`}, then the ones related to {@link Group#sensorMix|`Groups`} on the sensor phase,
 * in inverse hierarchical order (inner groups first), then central mixes, then the ones related to {@link Group#actuatorMix|`Groups`} on the actuator phase in
 * hierarchical order (outer groups first), and finally the ones related to {@link Actuator#mix|`Actuators`}.
 */
export class MixingGraph {
    
    /** All the origins the whole system is using in some mix. This contains both origins coming from the system or from a {@link Sensor|`Sensor`}'s raw data. */
    public origins: DatumOrigin[] = [];
    
    /** All the mixes in the system that are linked to a sensor with {@link Sensor#mix|`Sensor.mix`} and their dependencies. */
    public sensors: MixingGraphSensor[] = [];
    
    /** All the mixes in the system that are linked to a group on the sensor phase with {@link Group#sensorMix|`Group.sensorMix`} and their dependencies. */
    public sensorGroups: MixingGraphGroup[] = [];
    
    /** All the mixes in the system that are assigned to the center of the cycle. */
    public centers: MixingGraphCenter[] = [];
    
    /** All the mixes in the system that are linked to a group on the actuator phase with {@link Group#actuatorMix|`Group.actuatorMix`} and their dependencies. */
    public actuatorGroups: MixingGraphGroup[] = [];
    
    /** All the mixes in the system that are linked to an actuator with {@link Actuator#mix|`Actuator.mix`} and their dependencies. */
    public actuators: MixingGraphActuator[] = [];
    
    /**
     * Add an origin to the graph, if not already present.
     *
     * @param {DatumOrigin} origin - The new origin.
     */
    public addOrigin(origin: DatumOrigin): void {
        if (!this.origins.includes(origin)) {
            this.origins.push(origin);
        }
    }
    
    /**
     * Given the dependencies between elements according to this graph, separate all the
     * mixes linked to a group in the smallest number of different levels, so that at each
     * level's groups' mixes depend only on mixes from previous levels.
     *
     * @returns {MixingGraphGroupLevels} The groups separated by level, groups in the level
     *                                   at the smallest index in the array are not dependent
     *                                   on any other group, and so on.
     */
    public generateGroupLevels(): MixingGraphGroupLevels {
        let alreadyFound: MixingGraphGroup[]              = [];
        let nextLevel: MixingGraphGroupLevel;
        const sensorGroupsLevels: MixingGraphGroupLevel[] = [];
        do {
            nextLevel = this.sensorGroups.filter(
                group =>
                    !alreadyFound.includes(group)
                    && group.dependingOn.every(
                        dependency =>
                            (dependency.origin != DatumOrigin.GROUP) || (alreadyFound.some(found => found.name == dependency.name))
                    )
            );
            if (nextLevel.length > 0) {
                sensorGroupsLevels.push(nextLevel);
                alreadyFound.push(...nextLevel);
            }
        } while (nextLevel.length > 0);
        
        alreadyFound                                        = [];
        const actuatorGroupsLevels: MixingGraphGroupLevel[] = [];
        do {
            nextLevel = this.actuatorGroups.filter(
                group =>
                    !alreadyFound.includes(group)
                    && group.dependingOn.every(
                        dependency =>
                            (dependency.origin != DatumOrigin.GROUP) || (alreadyFound.some(found => found.name == dependency.name))
                    )
            );
            if (nextLevel.length > 0) {
                actuatorGroupsLevels.push(nextLevel);
                alreadyFound.push(...nextLevel);
            }
        } while (nextLevel.length > 0);
        
        return {
            actuatorGroupLevels: actuatorGroupsLevels,
            sensorGroupLevels:   sensorGroupsLevels
        };
    }
    
    /**
     * Get all the mixes that another mix depends on.
     *
     * @param {MixGraphElement} element - The element to check for dependencies.
     * @returns {MixGraphElement[]} - All the dependencies of `element`.
     */
    public getDependingFrom(element: MixGraphElement): MixGraphElement[] {
        if (element instanceof MixingGraphSensor) {
            return [
                ...this.sensorGroups.filter(
                    group =>
                        group
                            .dependingOn
                            .some(dependency =>
                                      dependency.origin == DatumOrigin.SENSOR
                                      && dependency.name == element.name
                            )
                ),
                ...this.centers.filter(
                    group =>
                        group
                            .dependingOn
                            .some(dependency =>
                                      dependency.origin == DatumOrigin.SENSOR
                                      && dependency.name == element.name
                            )
                )
            ];
            
        } else if (element instanceof MixingGraphGroup) {
            if (element.sensorPhase) {
                return [
                    ...this.sensorGroups.filter(
                        group =>
                            group
                                .dependingOn
                                .some(dependency =>
                                          dependency.origin == DatumOrigin.GROUP
                                          && dependency.name == element.name
                                )
                    ),
                    ...this.centers.filter(
                        group =>
                            group
                                .dependingOn
                                .some(dependency =>
                                          dependency.origin == DatumOrigin.GROUP
                                          && dependency.name == element.name
                                )
                    )
                ];
            } else {
                return [
                    ...this.actuatorGroups.filter(
                        group =>
                            group
                                .dependingOn
                                .some(dependency =>
                                          dependency.origin == DatumOrigin.GROUP
                                          && dependency.name == element.name
                                )
                    ),
                    ...this.actuators.filter(
                        group =>
                            group
                                .dependingOn
                                .some(dependency =>
                                          dependency.origin == DatumOrigin.GROUP
                                          && dependency.name == element.name
                                )
                    )
                ];
            }
        } else if (element instanceof MixingGraphCenter) {
            
            return [
                ...this.actuatorGroups.filter(
                    group =>
                        group
                            .dependingOn
                            .some(dependency =>
                                      dependency.origin == DatumOrigin.CENTER
                                      && dependency.name == element.name
                            )
                ),
                ...this.actuators.filter(
                    group =>
                        group
                            .dependingOn
                            .some(dependency =>
                                      dependency.origin == DatumOrigin.CENTER
                                      && dependency.name == element.name
                            )
                )
            ];
        }
        return [];
    }
    
    /**
     * Converts the mixing graph instance into its JSON representation.
     *
     * @returns {MixingGraphJSON} The JSON representation of `this`.
     */
    public toJSON(): MixingGraphJSON {
        return {
            origins:        this.origins.slice(),
            sensors:        this.sensors.map(sensor => sensor.toJSON()),
            sensorGroups:   this.sensorGroups.map(group => group.toJSON()),
            centers:        this.centers.map(center => center.toJSON()),
            actuatorGroups: this.actuatorGroups.map(group => group.toJSON()),
            actuators:      this.actuators.map(actuator => actuator.toJSON())
        };
    }
    
    /**
     * Constructs a new {@link MixingGraph|`MixingGraph`} instance from a given JSON representation.
     *
     * @param {MixingGraphJSON} mixingGraphJSON - The JSON representation of the mixing graph.
     * @returns {MixingGraph} The mixing graph object constructed from the provided JSON.
     */
    public static fromJSON(mixingGraphJSON: MixingGraphJSON): MixingGraph {
        const graph        = new MixingGraph();
        graph.origins        = mixingGraphJSON.origins.slice();
        graph.sensors        = mixingGraphJSON.sensors.map(sensor => MixingGraphSensor.fromJSON(sensor));
        graph.sensorGroups   = mixingGraphJSON.sensorGroups.map(group => MixingGraphGroup.fromJSON(group));
        graph.centers        = mixingGraphJSON.centers.map(center => MixingGraphCenter.fromJSON(center));
        graph.actuatorGroups = mixingGraphJSON.actuatorGroups.map(group => MixingGraphGroup.fromJSON(group));
        graph.actuators      = mixingGraphJSON.actuators.map(actuator => MixingGraphActuator.fromJSON(actuator));
        return graph;
    }
    
}

/**
 * An element of a {@link MixingGraph|`MixingGraph`} that represents a mix in the main calculation, with its dependencies on some datum.
 */
export type MixGraphElement = MixingGraphActuator | MixingGraphGroup | MixingGraphSensor | MixingGraphCenter;

/**
 * A dependency between a {@link MixGraphElement|`MixGraphElement`s} and some {@link Datum|`Datum`} in a {@link MixingGraph|`MixingGraph`}.
 */
export class MixingGraphDependency {
    
    /**
     * Creates an instance of the class.
     *
     * @param {DatumOrigin} origin - The origin of the datum on which the element depends.
     * @param {string} name - The name of the datum on which the element depends.
     */
    constructor(public origin: DatumOrigin, public name?: string) {}
    
    /**
     * Converts the dependency instance into its JSON representation.
     *
     * @returns {MixingGraphDependencyJSON} The JSON representation of `this`.
     */
    public toJSON(): MixingGraphDependencyJSON {
        return {
            origin: this.origin,
            name:   this.name
        };
    }
    
    /**
     * Constructs a new {@link MixingGraphDependency|`MixingGraphDependency`} instance from a given JSON representation.
     *
     * @param {MixingGraphDependencyJSON} mixingGraphDependencyJSON - The JSON representation of the dependency.
     * @returns {MixingGraphDependency} The dependency object constructed from the provided JSON.
     */
    public static fromJSON(mixingGraphDependencyJSON: MixingGraphDependencyJSON): MixingGraphDependency {
        return new MixingGraphDependency(mixingGraphDependencyJSON.origin, mixingGraphDependencyJSON.name);
    }
    
}

/**
 * A {@link MixGraphElement|`MixGraphElement`} that represents a mix linked to a {@link Sensor|`Sensor`} through {@link Sensor#mix|`Sensor.mix`}.
 */
export class MixingGraphSensor {
    
    /** All the dependencies of this element. */
    public dependingOn: MixingGraphDependency[] = [];
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - The unique name of the {@link Sensor|`Sensor`} {@link Sensor#mix|this mix} is linked to.
     * @param {string} displayName - The name of the {@link Sensor|`Sensor`} {@link Sensor#mix|this mix} is linked to, for display purposes.
     * @param {SensorType} type - The type of the {@link Sensor|`Sensor`} {@link Sensor#mix|this mix} is linked to.
     * @param {number} mix - The unique id of the mix referenced by this element.
     */
    constructor(
        public name: string,
        public displayName: string,
        public type: SensorType,
        public mix: number
    ) { }
    
    /**
     * Converts the element into its JSON representation.
     *
     * @returns {MixingGraphSensorJSON} The JSON representation of `this`.
     */
    public toJSON(): MixingGraphSensorJSON {
        return {
            name:        this.name,
            displayName: this.displayName,
            type:        this.type,
            dependingOn: this.dependingOn.map(dependency => dependency.toJSON()),
            mix: this.mix
        };
    }
    
    /**
     * Constructs a new {@link MixingGraphSensor|`MixingGraphSensor`} instance from a given JSON representation.
     *
     * @param {MixingGraphSensorJSON} mixingGraphSensorJSON - The JSON representation of the element.
     * @returns {MixingGraphSensor} The element constructed from the provided JSON.
     */
    public static fromJSON(mixingGraphSensorJSON: MixingGraphSensorJSON): MixingGraphSensor {
        const mixingGraphSensor       = new MixingGraphSensor(
            mixingGraphSensorJSON.name,
            mixingGraphSensorJSON.displayName,
            mixingGraphSensorJSON.type,
            mixingGraphSensorJSON.mix
        );
        mixingGraphSensor.dependingOn = mixingGraphSensorJSON.dependingOn.map(dependency => MixingGraphDependency.fromJSON(dependency));
        return mixingGraphSensor;
    }
}


/**
 * A {@link MixGraphElement|`MixGraphElement`} that represents a mix assigned to the center of the cycle.
 */
export class MixingGraphCenter {
    
    /** All the dependencies of this element. */
    public dependingOn: MixingGraphDependency[] = [];
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - The unique name of the center mix referenced by this element.
     * @param {string} displayName - The name of the center mix referenced by this element, for display purposes.
     * @param {number} mix - The unique id of the mix referenced by this element.
     */
    constructor(
        public name: string,
        public displayName: string,
        public mix: number
    ) {
    
    }
    
    /**
     * Converts the element into its JSON representation.
     *
     * @returns {MixingGraphCenterJSON} The JSON representation of `this`.
     */
    public toJSON(): MixingGraphCenterJSON {
        return {
            name:        this.name,
            displayName: this.displayName,
            dependingOn: this.dependingOn.map(dependency => dependency.toJSON()),
            mix: this.mix
        };
    }
    
    /**
     * Constructs a new {@link MixingGraphSensor|`MixingGraphSensor`} instance from a given JSON representation.
     *
     * @param {MixingGraphCenterJSON} mixingGraphCenterJSON - The JSON representation of the element.
     * @returns {MixingGraphCenter} The element constructed from the provided JSON.
     */
    public static fromJSON(mixingGraphCenterJSON: MixingGraphCenterJSON): MixingGraphCenter {
        const mixingGraphSensor       = new MixingGraphCenter(
            mixingGraphCenterJSON.name,
            mixingGraphCenterJSON.displayName,
            mixingGraphCenterJSON.mix
        );
        mixingGraphSensor.dependingOn = mixingGraphCenterJSON.dependingOn.map(dependency => MixingGraphDependency.fromJSON(dependency));
        return mixingGraphSensor;
    }
}

/**
 * A {@link MixGraphElement|`MixGraphElement`} that represents a mix linked to a {@link Group|`Group`}
 * either in the sensor phase through {@link Group#sensorMix|`Group.sensorMix`} or in the actuator phase
 * through {@link Group#actuatorMix|`Group.actuatorMix`}.
 */
export class MixingGraphGroup {
    
    /** All the dependencies of this element. */
    public dependingOn: MixingGraphDependency[] = [];
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - The unique name of the {@link Group|`Group`} {@link MixingGraphGroup#mix|this mix} is linked to.
     * @param {string} displayName - The name of the {@link Group|`Group`} {@link MixingGraphGroup#mix|this mix} is linked to, for display purposes.
     * @param {boolean} sensorPhase - Whether {@link MixingGraphGroup#mix|the mix} is linked to the {@link Group|`Group`} in the sensor
     *                                phase through {@link Group#sensorMix|`Group.sensorMix`} or in the actuator phase through {@link Group#actuatorMix|`Group.actuatorMix`}.
     * @param {number} mix - The unique id of the mix referenced by this element.
     */
    constructor(
        public name: string,
        public displayName: string,
        public sensorPhase: boolean,
        public mix: number
    ) {
    
    }
    
    /**
     * Converts the element into its JSON representation.
     *
     * @returns {MixingGraphGroupJSON} The JSON representation of `this`.
     */
    public toJSON(): MixingGraphGroupJSON {
        return {
            name:        this.name,
            displayName: this.displayName,
            dependingOn: this.dependingOn.map(dependency => dependency.toJSON()),
            sensorPhase: this.sensorPhase,
            mix: this.mix
        };
    }
    
    /**
     * Constructs a new {@link MixingGraphSensor|`MixingGraphSensor`} instance from a given JSON representation.
     *
     * @param {MixingGraphGroupJSON} mixingGraphGroupJSON - The JSON representation of the element.
     * @returns {MixingGraphGroup} The element constructed from the provided JSON.
     */
    public static fromJSON(mixingGraphGroupJSON: MixingGraphGroupJSON): MixingGraphGroup {
        const mixingGraphGroup = new MixingGraphGroup(
            mixingGraphGroupJSON.name,
            mixingGraphGroupJSON.displayName,
            mixingGraphGroupJSON.sensorPhase,
            mixingGraphGroupJSON.mix
        );
        mixingGraphGroup.dependingOn = mixingGraphGroupJSON.dependingOn.map(dependency => MixingGraphDependency.fromJSON(dependency));
        return mixingGraphGroup;
    }
}

/**
 * This is one tier of {@link MixingGraphGroupLevels|`MixingGraphGroupLevels`}, representing an array of groups
 * that are not dependent on each other.
 */
export type MixingGraphGroupLevel = MixingGraphGroup[];

/**
 * A representation of a {@link MixingGraph|`MixingGraph`'s} mixes linked to {@link MixingGraph#sensorGroups|sensor groups} and
 * {@link MixingGraph#actuatorGroups|actuator groups} separated in {@link MixingGraphGroupLevel|levels} such that at each level's
 * groups' mixes depend only on mixes from previous levels.
 *
 * @see {@link MixingGraph#generateGroupLevels|`MixingGraph.generateGroupLevels()`}.
 */
export interface MixingGraphGroupLevels {
    /** The mixes linked to {@link MixingGraph#sensorGroups|sensor groups}, separated in levels. */
    actuatorGroupLevels: MixingGraphGroupLevel[],
    /** The mixes linked to {@link MixingGraph#actuatorGroups|actuator groups}, separated in levels. */
    sensorGroupLevels: MixingGraphGroupLevel[]
}

/**
 * A {@link MixGraphElement|`MixGraphElement`} that represents a mix linked to a {@link Actuator|`Actuator`} through {@link Actuator#mix|`Actuator.mix`}.
 */
export class MixingGraphActuator {
    
    /** All the dependencies of this element. */
    public dependingOn: MixingGraphDependency[] = [];
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - The unique name of the {@link Actuator|`Actuator`} {@link Actuator#mix|this mix} is linked to.
     * @param {string} displayName - The name of the {@link Actuator|`Actuator`} {@link Actuator#mix|this mix} is linked to, for display purposes.
     * @param {ActuatorType} type - The type of the {@link Actuator|`Actuator`} {@link Actuator#mix|this mix} is linked to.
     * @param {number} mix - The unique id of the mix referenced by this element.
     */
    constructor(
        public name: string,
        public displayName: string,
        public type: ActuatorType,
        public mix: number
    ) {
    }
    
    /**
     * Converts the element into its JSON representation.
     *
     * @returns {MixingGraphActuatorJSON} The JSON representation of `this`.
     */
    public toJSON(): MixingGraphActuatorJSON {
        return {
            name:        this.name,
            displayName: this.displayName,
            type:        this.type,
            dependingOn: this.dependingOn.map(dependency => dependency.toJSON()),
            mix: this.mix
        };
    }
    
    /**
     * Constructs a new {@link MixingGraphActuator|`MixingGraphActuator`} instance from a given JSON representation.
     *
     * @param {MixingGraphActuatorJSON} mixingGraphActuatorJSON - The JSON representation of the element.
     * @returns {MixingGraphActuator} The element constructed from the provided JSON.
     */
    public static fromJSON(mixingGraphActuatorJSON: MixingGraphActuatorJSON): MixingGraphActuator {
        const mixingGraphActuator       = new MixingGraphActuator(
            mixingGraphActuatorJSON.name,
            mixingGraphActuatorJSON.displayName,
            mixingGraphActuatorJSON.type,
            mixingGraphActuatorJSON.mix
        );
        mixingGraphActuator.dependingOn = mixingGraphActuatorJSON.dependingOn.map(dependency => MixingGraphDependency.fromJSON(dependency));
        return mixingGraphActuator;
    }
    
}

/**
 * The serialization of the class {@link MixingGraph|`MixingGraph`}.
 */
export class MixingGraphJSON {
    
    
    /**
     * Serialization of the property {@link MixingGraph#origins|`origins`}.
     */
    @IsArray()
    @IsEnum(DatumOrigin)
    public origins: DatumOrigin[] = [];
    
    /**
     * Serialization of the property {@link MixingGraph#sensors|`sensors`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphSensorJSON)
    public sensors: MixingGraphSensorJSON[] = [];
    
    /**
     * Serialization of the property {@link MixingGraph#sensorGroups|`sensorGroups`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphGroupJSON)
    public sensorGroups: MixingGraphGroupJSON[] = [];
    
    /**
     * Serialization of the property {@link MixingGraph#centers|`centers`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphCenterJSON)
    public centers: MixingGraphCenterJSON[] = [];
    
    /**
     * Serialization of the property {@link MixingGraph#actuatorGroups|`actuatorGroups`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphGroupJSON)
    public actuatorGroups: MixingGraphGroupJSON[] = [];
    
    /**
     * Serialization of the property {@link MixingGraph#actuators|`actuators`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphActuatorJSON)
    public actuators: MixingGraphActuatorJSON[] = [];
    
}

/**
 * The serialization of the class {@link MixingGraphDependency|`MixingGraphDependency`}.
 */
export class MixingGraphDependencyJSON {
    
    /**
     * Serialization of the property {@link MixingGraphDependency#origin|`origin`}.
     */
    @IsEnum(DatumOrigin)
    public origin: DatumOrigin;
    
    /**
     * Serialization of the property {@link MixingGraphDependency#name|`name`}.
     */
    @IsOptional()
    @IsString()
    public name?: string;
    
    /**
     * Creates an instance of the class.
     *
     * @param {DatumOrigin} origin - Value for {@link MixingGraphDependencyJSON#origin|`origin`}.
     * @param {string} name - Value for {@link MixingGraphDependencyJSON#origin|`origin`}.
     */
    constructor(origin: DatumOrigin, name?: string) {
        this.origin = origin;
        this.name   = name;
    }
    
}

/**
 * The serialization of the class {@link MixingGraphSensor|`MixingGraphSensor`}.
 */
export class MixingGraphSensorJSON {
    
    
    /**
     * Serialization of the property {@link MixingGraphSensor#name|`name`}.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    /**
     * Serialization of the property {@link MixingGraphSensor#displayName|`displayName`}.
     */
    @IsNotEmpty()
    public displayName: string;
    
    /**
     * Serialization of the property {@link MixingGraphSensor#type|`type`}.
     */
    @IsEnum(SensorType)
    public type: SensorType;
    
    /**
     * Serialization of the property {@link MixingGraphSensor#dependingOn|`dependingOn`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphDependencyJSON)
    public dependingOn: MixingGraphDependencyJSON[];
    
    /**
     * Serialization of the property {@link MixingGraphSensor#mix|`mix`}.
     */
    @IsDefined()
    @Min(0)
    @IsInt()
    public mix: number;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - Value for {@link MixingGraphSensorJSON#name|`name`}.
     * @param {string} displayName - Value for {@link MixingGraphSensorJSON#displayName|`displayName`}.
     * @param {SensorType} type - Value for {@link MixingGraphSensorJSON#type|`type`}.
     * @param {MixingGraphDependencyJSON[]} dependingOn - Value for {@link MixingGraphSensorJSON#dependingOn|`dependingOn`}.
     * @param {number} mix - Value for {@link MixingGraphSensorJSON#mix|`mix`}.
     */
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
        this.mix  = mix;
    }
}


/**
 * The serialization of the class {@link MixingGraphCenter|`MixingGraphCenter`}.
 */
export class MixingGraphCenterJSON {
    
    
    /**
     * Serialization of the property {@link MixingGraphCenter#name|`name`}.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    /**
     * Serialization of the property {@link MixingGraphCenter#displayName|`displayName`}.
     */
    @IsNotEmpty()
    public displayName: string;
    
    /**
     * Serialization of the property {@link MixingGraphCenter#dependingOn|`dependingOn`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphDependencyJSON)
    public dependingOn: MixingGraphDependencyJSON[];
    
    /**
     * Serialization of the property {@link MixingGraphCenter#mix|`mix`}.
     */
    @IsDefined()
    @Min(0)
    @IsInt()
    public mix: number;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - Value for {@link MixingGraphCenterJSON#name|`name`}.
     * @param {string} displayName - Value for {@link MixingGraphCenterJSON#displayName|`displayName`}.
     * @param {MixingGraphDependencyJSON[]} dependingOn - Value for {@link MixingGraphCenterJSON#dependingOn|`dependingOn`}.
     * @param {number} mix - Value for {@link MixingGraphCenterJSON#mix|`mix`}.
     */
    constructor(
        name: string,
        displayName: string,
        dependingOn: MixingGraphDependencyJSON[],
        mix: number
    ) {
        this.name = name;
        this.displayName = displayName;
        this.dependingOn = dependingOn;
        this.mix  = mix;
    }
}

/**
 * The serialization of the class {@link MixingGraphGroup|`MixingGraphGroup`}.
 */
export class MixingGraphGroupJSON {
    
    
    /**
     * Serialization of the property {@link MixingGraphGroup#name|`name`}.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    /**
     * Serialization of the property {@link MixingGraphGroup#displayName|`displayName`}.
     */
    @IsNotEmpty()
    public displayName: string;
    
    /**
     * Serialization of the property {@link MixingGraphGroup#sensorPhase|`sensorPhase`}.
     */
    @IsBoolean()
    public sensorPhase: boolean;
    
    /**
     * Serialization of the property {@link MixingGraphGroup#dependingOn|`dependingOn`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphDependencyJSON)
    public dependingOn: MixingGraphDependencyJSON[];
    
    /**
     * Serialization of the property {@link MixingGraphGroup#mix|`mix`}.
     */
    @IsDefined()
    @Min(0)
    @IsInt()
    public mix: number;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - Value for {@link MixingGraphGroupJSON#name|`name`}.
     * @param {string} displayName - Value for {@link MixingGraphGroupJSON#displayName|`displayName`}.
     * @param {boolean} sensorPhase - Value for {@link MixingGraphGroupJSON#sensorPhase|`sensorPhase`}.
     * @param {MixingGraphDependencyJSON[]} dependingOn - Value for {@link MixingGraphGroupJSON#dependingOn|`dependingOn`}.
     * @param {number} mix - Value for {@link MixingGraphGroupJSON#mix|`mix`}.
     */
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
        this.mix  = mix;
    }
}

/**
 * The serialization of the class {@link MixingGraphActuator|`MixingGraphActuator`}.
 */
export class MixingGraphActuatorJSON {
    
    
    /**
     * Serialization of the property {@link MixingGraphActuator#name|`name`}.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    /**
     * Serialization of the property {@link MixingGraphActuator#displayName|`displayName`}.
     */
    @IsNotEmpty()
    public displayName: string;
    
    /**
     * Serialization of the property {@link MixingGraphActuator#type|`type`}.
     */
    @IsEnum(ActuatorType)
    public type: ActuatorType;
    
    /**
     * Serialization of the property {@link MixingGraphActuator#dependingOn|`dependingOn`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => MixingGraphDependencyJSON)
    public dependingOn: MixingGraphDependencyJSON[];
    
    /**
     * Serialization of the property {@link MixingGraphActuator#mix|`mix`}.
     */
    @IsDefined()
    @Min(0)
    @IsInt()
    public mix: number;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - Value for {@link MixingGraphActuatorJSON#name|`name`}.
     * @param {string} displayName - Value for {@link MixingGraphActuatorJSON#displayName|`displayName`}.
     * @param {ActuatorType} type - Value for {@link MixingGraphActuatorJSON#type|`type`}.
     * @param {MixingGraphDependencyJSON[]} dependingOn - Value for {@link MixingGraphActuatorJSON#dependingOn|`dependingOn`}.
     * @param {number} mix - Value for {@link MixingGraphActuatorJSON#mix|`mix`}.
     */
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
        this.mix  = mix;
    }
}
