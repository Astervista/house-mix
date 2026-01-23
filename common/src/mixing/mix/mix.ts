import {Allow, IsArray, IsDefined, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Type, ValidateIf, ValidateNested} from "rest-decorators";
import {Datum, DatumJSON, ExportedDatum, ExportedDatumJSON} from "./datum";
import {ElaborationNode, ElaborationNodeJSON} from "./elaboration-node";


export enum CompositionCalculationErrorType {
    CYCLIC_GRAPH = "CYCLIC_GRAPH",
    UNKNOWN_NODE = "UNKNOWN_NODE",
}

export class CompositionCalculationError extends Error {
    constructor(
        public readonly type: CompositionCalculationErrorType) {
        super(`Error while calculating composition result. Error type ${type}`);
    }
}

export enum CompositionCalculationOutputErrorType {
    MISSING_OUTPUT    = "MISSING_OUTPUT",
    WRONG_OUTPUT_TYPE = "WRONG_OUTPUT_TYPE",
    UNKNOWN_OUTPUT_NAME = "UNKNOWN_OUTPUT_NAME",
}

export class CompositionCalculationOutputError extends Error {
    constructor(
        public readonly type: CompositionCalculationOutputErrorType,
        public readonly outputName: string) {
        super(`Error while calculating composition result. Error type ${type} on output ${outputName}`);
    }
}

export enum CompositionCalculationInputErrorType {
    UNKNOWN_INPUT_NAME = "UNKNOWN_INPUT_NAME",
}

export class CompositionCalculationInputError extends Error {
    constructor(
        public readonly type: CompositionCalculationInputErrorType,
        public readonly input: string) {
        super(`Error while calculating composition result. Error type ${type} on input ${input}`);
    }
}

export class Mix {
    
    private _id: number | "NEW";
    
    public inputs: Datum[]  = [];
    public outputs: Datum[] = [];
    
    public imports: ExportedDatum[] = [];
    
    public nodes: ElaborationNode[]  = [];
    public connections: Connection[] = [];
    
    constructor(id: number | "NEW") {
        this._id = id;
    }
    
    public get id(): number | "NEW" {
        return this._id;
    }
    
    public set id(value: number | "NEW") {
        if (this._id == "NEW") {
            this._id = value;
        }
    }
    
    public calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        if (this.containsCycles()) {
            throw new CompositionCalculationError(CompositionCalculationErrorType.CYCLIC_GRAPH);
        }
        const knownInputs: Map<number, Map<string, unknown>> = new Map<number, Map<string, unknown>>();
        const discoveredNodes: Set<ElaborationNode>          = new Set<ElaborationNode>;
        const results: Map<string, unknown>                  = new Map<string, unknown>();
        
        const addOutput = (connection: Connection, value: unknown): void => {
            if (connection.drainType == ConnectionDrainType.OUTPUT) {
                if (this.outputs.some(output => output.name == connection.outputName)) {
                    results.set(connection.outputName, value);
                } else {
                    throw new CompositionCalculationOutputError(CompositionCalculationOutputErrorType.UNKNOWN_OUTPUT_NAME, connection.outputName);
                }
            } else {
                let nodeKnownInputs = knownInputs.get(connection.drainNodeId);
                if (nodeKnownInputs == null) {
                    nodeKnownInputs = new Map<string, unknown>();
                    knownInputs.set(connection.drainNodeId, nodeKnownInputs);
                }
                nodeKnownInputs.set(connection.drainNodeInputName, value);
                const node = this.nodes.find(candidateNode => candidateNode.id == connection.drainNodeId);
                if (node == null) {
                    throw new CompositionCalculationError(CompositionCalculationErrorType.UNKNOWN_NODE);
                }
                discoveredNodes.add(node);
            }
        };
        
        for (const connection of this.sourceConnections) {
            if (inputValues.has(connection.inputName)) {
                addOutput(connection, inputValues.get(connection.inputName));
            } else {
                throw new CompositionCalculationInputError(CompositionCalculationInputErrorType.UNKNOWN_INPUT_NAME, connection.inputName);
            }
        }
        
        for (const connection of this.constantConnections) {
            addOutput(connection, connection.sourceValue);
        }
        
        let unchanged: boolean = true;
        do {
            unchanged = true;
            for (const node of discoveredNodes) {
                const nodeKnownInputs = knownInputs.get(node.id);
                if (nodeKnownInputs == null) {
                    continue;
                }
                // Check if every input is known
                if (node.inputs.every(input => nodeKnownInputs.has(input.name))) {
                    // If it is, we advance the discovery by adding to the known inputs the outputs of this node
                    unchanged     = false;
                    const outputs = node.elaborate(nodeKnownInputs);
                    // Get all the outgoing connections to update
                    for (const connection of this.getConnectionsFromNode(node.id)) {
                        addOutput(connection, outputs.get(connection.sourceNodeOutputName));
                    }
                    discoveredNodes.delete(node);
                }
            }
        } while (!unchanged && discoveredNodes.size > 0);
        
        for (const output of this.outputs) {
            if (!results.has(output.name) && !output.nullable) {
                throw {type: CompositionCalculationOutputErrorType.MISSING_OUTPUT, outputName: output.name} as CompositionCalculationOutputError;
            }
            const outputValue = results.get(output.name) ?? null;
            if (!output.checkValue(outputValue)) {
                throw {type: CompositionCalculationOutputErrorType.WRONG_OUTPUT_TYPE, outputName: output.name} as CompositionCalculationOutputError;
            }
        }
        
        return results;
    }
    
    public get sourceConnections(): (ConnectionSourceFromInput & ConnectionDrain)[] {
        return this.connections.filter((connection: Connection): connection is ConnectionSourceFromInput & ConnectionDrain => {
            return connection.sourceType == ConnectionSourceType.INPUT;
        });
    }
    
    public get constantConnections(): (ConnectionSourceFromConstant & ConnectionDrain)[] {
        return this.connections.filter((connection: Connection): connection is ConnectionSourceFromConstant & ConnectionDrain => {
            return connection.sourceType == ConnectionSourceType.CONSTANT;
        });
    }
    
    public getConnectionsFromNode(nodeId: number): (ConnectionSourceFromNode & ConnectionDrain)[] {
        return this
            .connections
            .filter((connection: Connection): connection is ConnectionSourceFromNode & ConnectionDrain => {
                return connection.sourceType == ConnectionSourceType.NODE && connection.sourceNodeId == nodeId;
            });
    }
    
    public containsCycles(): boolean {
        const firstChildren = new Set<number>(
            this
                .connections
                .filter((connection: Connection): connection is ConnectionSourceFromInput & ConnectionDrainToNode => {
                    return connection.sourceType == ConnectionSourceType.INPUT && connection.drainType == ConnectionDrainType.NODE;
                })
                .map(connection => connection.drainNodeId)
        );
        for (const firstChild of firstChildren) {
            if (this.checkCycleDepth(new Set<number>(), firstChild)) {
                return true;
            }
        }
        return false;
    }
    
    private checkCycleDepth(passed: Set<number>, current: number): boolean {
        passed.add(current);
        let isCyclic: boolean = false;
        const children        = new Set(
            this
                .getConnectionsFromNode(current)
                .filter((connection): connection is ConnectionSourceFromNode & ConnectionDrainToNode => connection.drainType == ConnectionDrainType.NODE)
                .map(connection => connection.drainNodeId)
        );
        for (const child of children) {
            if (passed.has(child) || this.checkCycleDepth(passed, child)) {
                isCyclic = true;
                break;
            }
        }
        passed.delete(current);
        return isCyclic;
    }
    
    public wouldAddCycle(connection: Connection): boolean {
        if ((connection.sourceType == ConnectionSourceType.NODE) && (connection.drainType == ConnectionDrainType.NODE)) {
            if (this.connections.some(otherConnection =>
                                          otherConnection.drainType == ConnectionDrainType.NODE &&
                                          otherConnection.drainNodeId == connection.drainNodeId &&
                                          otherConnection.drainNodeInputName == connection.drainNodeInputName &&
                                          otherConnection.sourceType == ConnectionSourceType.NODE &&
                                          otherConnection.sourceNodeId == connection.sourceNodeId &&
                                      otherConnection.sourceNodeOutputName == connection.sourceNodeOutputName
            )) {
                return false;
            }
            this.connections.push(connection);
            const result = this.containsCycles();
            this.connections.pop();
            return result;
        } else {
            return false;
        }
    }
    
    public getInputByNodeAndName(nodeId: number, inputName: string): Datum | null {
        const node = this.nodes.find(otherNode => otherNode.id == nodeId);
        if (node != null) {
            return node.inputs.find(input => input.name == inputName) ?? null;
        }
        return null;
    }
    
    public toJSON(): MixJSON {
        return {
            id:          this.id,
            inputs:      this.inputs.slice().map(input => input.toJSON()),
            outputs:     this.outputs.slice().map(output => output.toJSON()),
            nodes:       this.nodes.map(node => node.toJSON()),
            connections: this.connections.slice(),
            imports:     this.imports.slice().map(input => input.toJSON()),
        };
    }
    
    public static fromJSON(mixJson: MixJSON): Mix {
        const mix       = new Mix(mixJson.id);
        mix.inputs      = mixJson.inputs.map(input => Datum.fromJSON(input));
        mix.outputs     = mixJson.outputs.map(output => Datum.fromJSON(output));
        mix.nodes       = mixJson.nodes.map(node => ElaborationNode.fromJSON(node));
        mix.connections = mixJson.connections.map(connection => ConnectionJSON.toConnection(connection));
        mix.imports     = mixJson.imports.map(input => ExportedDatum.fromJSON(input));
        return mix;
    }
}

export class MixJSON {
    
    @IsDefined()
    @ValidateIf((obj: MixJSON) => obj.id !== 'NEW')
    @IsPositive()
    public id: number | "NEW";
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumJSON)
    public inputs: DatumJSON[]  = [];
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumJSON)
    public outputs: DatumJSON[] = [];
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => ExportedDatumJSON)
    public imports: ExportedDatumJSON[] = [];
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => ElaborationNodeJSON)
    public nodes: ElaborationNodeJSON[] = [];
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => ConnectionJSON)
    public connections: ConnectionJSON[]    = [];
    
    constructor(id: number | "NEW") {
        this.id = id;
    }
}

export enum ConnectionSourceType {
    INPUT = "INPUT",
    NODE = "NODE",
    CONSTANT = "CONST"
}

export interface ConnectionSourceFromInput {
    sourceType: ConnectionSourceType.INPUT;
    inputName: string;
}

export interface ConnectionSourceFromNode {
    sourceType: ConnectionSourceType.NODE;
    sourceNodeId: number,
    sourceNodeOutputName: string,
}

export interface ConnectionSourceFromConstant {
    sourceType: ConnectionSourceType.CONSTANT;
    sourceValue: unknown,
}

type ConnectionSource = ConnectionSourceFromInput | ConnectionSourceFromNode | ConnectionSourceFromConstant

export enum ConnectionDrainType {
    OUTPUT = "OUTPUT",
    NODE = "NODE"
}

export interface ConnectionDrainToOutput {
    drainType: ConnectionDrainType.OUTPUT;
    outputName: string;
}

export interface ConnectionDrainToNode {
    drainType: ConnectionDrainType.NODE,
    drainNodeId: number,
    drainNodeInputName: string,
}

type ConnectionDrain = ConnectionDrainToOutput | ConnectionDrainToNode

export type Connection = ConnectionSource & ConnectionDrain;

export class ConnectionJSON {
    
    @IsEnum(ConnectionSourceType)
    public sourceType: ConnectionSourceType;
    
    @IsEnum(ConnectionDrainType)
    public drainType: ConnectionDrainType;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public inputName?: string;
    
    @IsOptional()
    @IsInt()
    @IsPositive()
    public sourceNodeId?: number;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public sourceNodeOutputName?: string;
    
    @Allow()
    public sourceValue?: unknown;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public outputName?: string;
    
    @IsOptional()
    @IsInt()
    @IsPositive()
    public drainNodeId?: number;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public drainNodeInputName?: string;
    
    constructor(sourceType: ConnectionSourceType, drainType: ConnectionDrainType) {
        this.sourceType = sourceType;
        this.drainType = drainType;
    }
    
    public static toConnection(connectionJSON: ConnectionJSON): Connection {
        if (ConnectionJSON.isValid(connectionJSON)) {
            let sourceResult: ConnectionSource;
            let drainResult: ConnectionDrain;
            switch (connectionJSON.sourceType) {
                case ConnectionSourceType.INPUT: {
                    sourceResult = {
                        sourceType: ConnectionSourceType.INPUT,
                        inputName: connectionJSON.inputName
                    };
                    break
                }
                case ConnectionSourceType.NODE: {
                    sourceResult = {
                        sourceType:   ConnectionSourceType.NODE,
                        sourceNodeId: connectionJSON.sourceNodeId,
                        sourceNodeOutputName: connectionJSON.sourceNodeOutputName
                    }
                    break;
                }
                case ConnectionSourceType.CONSTANT: {
                    sourceResult = {
                        sourceType: ConnectionSourceType.CONSTANT,
                        sourceValue: connectionJSON.sourceValue
                    }
                    break
                }
            }
            switch (connectionJSON.drainType) {
                case ConnectionDrainType.OUTPUT: {
                    drainResult = {
                        drainType:  ConnectionDrainType.OUTPUT,
                        outputName: connectionJSON.outputName
                    };
                    break;
                }
                case ConnectionDrainType.NODE: {
                    drainResult = {
                        drainType: ConnectionDrainType.NODE,
                        drainNodeId: connectionJSON.drainNodeId,
                        drainNodeInputName: connectionJSON.drainNodeInputName
                    }
                    break;
                }
            }
            return {
                ...sourceResult,
                ...drainResult
            }
        } else {
            throw new Error("The collection provided is not valid");
        }
    }
    
    public static isValid(connection: ConnectionJSON): connection is Connection {
        switch (connection.sourceType) {
            case ConnectionSourceType.INPUT:
                if (
                    connection.sourceValue != undefined ||
                    connection.sourceNodeId != undefined ||
                    connection.sourceNodeOutputName != undefined ||
                    connection.inputName == undefined
                ) {
                    return false
                }
                break;
            case ConnectionSourceType.NODE:
                if (
                    connection.sourceValue != undefined ||
                    connection.sourceNodeId == undefined ||
                    connection.sourceNodeOutputName == undefined ||
                    connection.inputName != undefined
                ) {
                    return false
                }
                break;
            case ConnectionSourceType.CONSTANT:
                if (
                    connection.sourceValue == undefined ||
                    connection.sourceNodeId != undefined ||
                    connection.sourceNodeOutputName != undefined ||
                    connection.inputName != undefined
                ) {
                    return false
                }
                break;
        }
        switch (connection.drainType) {
            case ConnectionDrainType.OUTPUT:
                if (
                    connection.drainNodeId != undefined ||
                    connection.drainNodeInputName != undefined ||
                    connection.outputName == undefined
                ) {
                    return false
                }
                break;
            case ConnectionDrainType.NODE:
                if (
                    connection.drainNodeId == undefined ||
                    connection.drainNodeInputName == undefined ||
                    connection.outputName != undefined
                ) {
                    return false
                }
                break;
        }
        return true;
    }
    
}
