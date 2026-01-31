import {Allow, IsArray, IsDefined, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, Type, ValidateIf, ValidateNested} from "rest-decorators";
import {Datum, DatumJSON, DatumOrigin, DatumType, ExportedDatum, ExportedDatumJSON} from "./datum";
import {ElaborationNode, ElaborationNodeJSON} from "./elaboration-node";


export enum CompositionCalculationErrorType {
    CYCLIC_GRAPH      = "CYCLIC_GRAPH",
    WRONG_CONNECTIONS = "WRONG_CONNECTIONS",
    UNKNOWN_NODE      = "UNKNOWN_NODE",
}

export class CompositionCalculationError extends Error {
    constructor(
        public readonly type: CompositionCalculationErrorType) {
        super(`Error while calculating composition result. Error type ${type}`);
    }
}

export enum CompositionCalculationOutputErrorType {
    MISSING_OUTPUT      = "MISSING_OUTPUT",
    WRONG_OUTPUT_TYPE   = "WRONG_OUTPUT_TYPE",
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
    
    private _inputs: Datum[]  = [];
    private _outputs: Datum[] = [];
    
    private _imports: ExportedDatum[] = [];
    
    private _nodes: ElaborationNode[]  = [];
    private _connections: Connection[] = [];
    
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
    
    public get nodes(): readonly ElaborationNode[] {
        return this._nodes.slice();
    }
    
    public addNode(elaborationNode: ElaborationNode): void {
        if (this._nodes.includes(elaborationNode)) {
            return;
        }
        this._nodes.push(elaborationNode);
        for (const input of elaborationNode.inputs) {
            if (!input.nullable) {
                this._connections.push({
                                           sourceType:         ConnectionSourceType.CONSTANT,
                                           sourceValue:        Datum.getDefaultForType(input.type),
                                           sourceValueType:    input.type,
                                           drainType:          ConnectionDrainType.NODE,
                                           drainNodeId:        elaborationNode.id,
                                           drainNodeInputName: input.name
                                       });
            }
        }
    }
    
    public removeNode(elaborationNode: ElaborationNode): void {
        const index = this._nodes.indexOf(elaborationNode);
        if (index == -1) {
            return;
        }
        this._nodes.splice(index, 1);
        const incomingConnections =
                  this
                      ._connections
                      .filter((connection): connection is ConnectionSource & ConnectionDrainToNode =>
                                  connection.drainType == ConnectionDrainType.NODE
                                  && connection.drainNodeId == elaborationNode.id
                      );
        const outgoingConnections =
                  this
                      ._connections
                      .filter((connection): connection is ConnectionSourceFromNode & ConnectionDrain =>
                                  connection.sourceType == ConnectionSourceType.NODE
                                  && connection.sourceNodeId == elaborationNode.id
                      );
        for (const connection of outgoingConnections) {
            this.removeConnection(connection);
        }
        for (const connection of incomingConnections) {
            this.removeConnection(connection);
        }
    }
    
    public get outputs(): readonly Datum[] {
        return this._outputs.slice();
    }
    
    public addOutput(output: Datum): void {
        this._outputs.push(output);
        if (!output.nullable) {
            this._connections.push(
                {
                    sourceType:      ConnectionSourceType.CONSTANT,
                    sourceValue:     Datum.getDefaultForType(output.type),
                    sourceValueType: output.type,
                    drainType:       ConnectionDrainType.OUTPUT,
                    outputName:      output.name
                });
        }
    }
    
    public removeOutput(output: Datum): void {
        const index = this._outputs.indexOf(output);
        if (index == -1) {
            return;
        }
        this._outputs.splice(index, 1);
        for (const connection of this._connections) {
            if (connection.drainType == ConnectionDrainType.OUTPUT && connection.outputName == output.name) {
                this.removeConnection(connection);
            }
        }
    }
    
    public get imports(): readonly ExportedDatum[] {
        return this._imports.slice();
    }
    
    public get inputs(): readonly Datum[] {
        return this._inputs.slice();
    }
    
    public addImport(datum: ExportedDatum): void {
        if (this._imports.includes(datum)) {
            return;
        }
        this._imports.push(datum);
        this._inputs.push(new Datum(datum.uniqueName, datum.type, datum.nullable));
    }
    
    public removeImport(imp: ExportedDatum): void {
        const position = this._imports.indexOf(imp);
        if (position == -1) {
            return;
        }
        this._imports.splice(position, 1);
        
        const input = this._inputs.find(otherInput => otherInput.name == imp.uniqueName);
        if (input == null) {
            return;
        }
        const inputPosition = this._inputs.indexOf(input);
        this._inputs.splice(inputPosition, 1);
        for (const connection of this._connections) {
            if (connection.sourceType == ConnectionSourceType.INPUT && connection.inputName == input.name) {
                this.removeConnection(connection);
            }
        }
    }
    
    public get connections(): readonly Connection[] {
        return this._connections.slice();
    }
    
    public addConnection(connection: Connection): void {
        if (this._connections.includes(connection)) {
            return;
        }
        if (connection.drainType == ConnectionDrainType.NODE) {
            const conflictingConnection =
                      this._connections.find(
                          (otherConnection) =>
                              otherConnection.drainType == ConnectionDrainType.NODE && otherConnection.drainNodeId == connection.drainNodeId &&
                              otherConnection.drainNodeInputName == connection.drainNodeInputName
                      );
            if (conflictingConnection?.sourceType == ConnectionSourceType.CONSTANT) {
                const index = this._connections.indexOf(conflictingConnection);
                if (index == -1) {
                    return;
                }
                this._connections.splice(index, 1);
            }
        } else { // ConnectionDrainType.OUTPUT
            const conflictingConnection =
                      this._connections.find(
                          (otherConnection) =>
                              otherConnection.drainType == ConnectionDrainType.OUTPUT && otherConnection.outputName == connection.outputName
                      );
            if (conflictingConnection?.sourceType == ConnectionSourceType.CONSTANT) {
                const index = this._connections.indexOf(conflictingConnection);
                if (index == -1) {
                    return;
                }
                this._connections.splice(index, 1);
            }
        }
        this._connections.push(connection);
    }
    
    public removeConnection(connection: Connection): void {
        const index = this._connections.indexOf(connection);
        if (index == -1) {
            return;
        }
        this._connections.splice(index, 1);
        // Transform connections to constant so that no nullable input hangs
        if (connection.drainType == ConnectionDrainType.NODE) {
            const drainNode = this._nodes.find(node => node.id == connection.drainNodeId);
            if (drainNode) {
                const drainInput = drainNode.inputs.find(input => input.name == connection.drainNodeInputName);
                if (drainInput) {
                    if (!drainInput.nullable) {
                        this._connections
                            .push(
                                {
                                    sourceType:         ConnectionSourceType.CONSTANT,
                                    sourceValue:        Datum.getDefaultForType(drainInput.type),
                                    sourceValueType:    drainInput.type,
                                    drainType:          ConnectionDrainType.NODE,
                                    drainNodeId:        drainNode.id,
                                    drainNodeInputName: drainInput.name
                                });
                    }
                }
            }
        } else {
            const drainOutput = this._outputs.find(output => output.name == connection.outputName);
            if (drainOutput) {
                if (!drainOutput.nullable) {
                    this
                        ._connections
                        .push({
                                  sourceType:      ConnectionSourceType.CONSTANT,
                                  sourceValue:     Datum.getDefaultForType(drainOutput.type),
                                  sourceValueType: drainOutput.type,
                                  drainType:       ConnectionDrainType.OUTPUT,
                                  outputName:      drainOutput.name
                              });
                }
            }
        }
    }
    
    public calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        if (this.containsCycles) {
            throw new CompositionCalculationError(CompositionCalculationErrorType.CYCLIC_GRAPH);
        }
        if (this.wrongConnections.length > 0) {
            throw new CompositionCalculationError(CompositionCalculationErrorType.WRONG_CONNECTIONS);
        }
        const knownInputs: Map<number, Map<string, unknown>> = new Map<number, Map<string, unknown>>();
        const discoveredNodes: Set<ElaborationNode>          = new Set<ElaborationNode>;
        const results: Map<string, unknown>                  = new Map<string, unknown>();
        
        const addOutput = (connection: Connection, value: unknown): void => {
            if (connection.drainType == ConnectionDrainType.OUTPUT) {
                if (this._outputs.some(output => output.name == connection.outputName)) {
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
                const node = this._nodes.find(candidateNode => candidateNode.id == connection.drainNodeId);
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
        
        for (const output of this._outputs) {
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
        return this._connections.filter((connection: Connection): connection is ConnectionSourceFromInput & ConnectionDrain => {
            return connection.sourceType == ConnectionSourceType.INPUT;
        });
    }
    
    public get constantConnections(): (ConnectionSourceFromConstant & ConnectionDrain)[] {
        return this._connections.filter((connection: Connection): connection is ConnectionSourceFromConstant & ConnectionDrain => {
            return connection.sourceType == ConnectionSourceType.CONSTANT;
        });
    }
    
    public getConnectionsFromNode(nodeId: number): (ConnectionSourceFromNode & ConnectionDrain)[] {
        return this
            ._connections
            .filter((connection: Connection): connection is ConnectionSourceFromNode & ConnectionDrain => {
                return connection.sourceType == ConnectionSourceType.NODE && connection.sourceNodeId == nodeId;
            });
    }
    
    public getDrainDatum(connection: Connection): Datum | null {
        switch (connection.drainType) {
            case ConnectionDrainType.OUTPUT:
                return this._outputs.find(output => output.name == connection.outputName) ?? null;
            case ConnectionDrainType.NODE: {
                const drainNode = this._nodes.find(node => node.id == connection.drainNodeId);
                if (drainNode) {
                    return drainNode.inputs.find(input => input.name == connection.drainNodeInputName) ?? null;
                } else {
                    return null;
                }
            }
        }
    }
    
    public getSourceDatum(connection: Connection): Datum | null {
        switch (connection.sourceType) {
            case ConnectionSourceType.CONSTANT:
                return null;
            case ConnectionSourceType.INPUT:
                return this._inputs.find(input => input.name == connection.inputName) ?? null;
            case ConnectionSourceType.NODE: {
                const drainNode = this._nodes.find(node => node.id == connection.sourceNodeId);
                if (drainNode) {
                    return drainNode.outputs.find(output => output.name == connection.sourceNodeOutputName) ?? null;
                } else {
                    return null;
                }
            }
        }
    }
    
    public get wrongConnections(): Connection[] {
        return this._connections.filter((connection) => {
            const drainDatum: Datum | null = this.getDrainDatum(connection);
            if (drainDatum == null) {
                return true;
            }
            switch (connection.sourceType) {
                case ConnectionSourceType.CONSTANT: {
                    return !drainDatum.checkValue(connection.sourceValue);
                }
                case ConnectionSourceType.NODE:
                case ConnectionSourceType.INPUT: {
                    const sourceDatum: Datum | null = this.getSourceDatum(connection);
                    return (sourceDatum == null
                            || (!drainDatum.nullable && sourceDatum.nullable)
                            || (drainDatum.type != sourceDatum.type));
                }
            }
            return false;
        });
    }
    
    public get containsCycles(): boolean {
        const firstChildren = new Set<number>(
            this
                ._connections
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
            if (this._connections.some(otherConnection =>
                                           otherConnection.drainType == ConnectionDrainType.NODE &&
                                           otherConnection.drainNodeId == connection.drainNodeId &&
                                           otherConnection.drainNodeInputName == connection.drainNodeInputName &&
                                           otherConnection.sourceType == ConnectionSourceType.NODE &&
                                           otherConnection.sourceNodeId == connection.sourceNodeId &&
                                           otherConnection.sourceNodeOutputName == connection.sourceNodeOutputName
            )) {
                return false;
            }
            this._connections.push(connection);
            const result = this.containsCycles;
            this._connections.pop();
            return result;
        } else if ((connection.sourceType == ConnectionSourceType.INPUT) && (connection.drainType == ConnectionDrainType.NODE)) {
            this._connections.push(connection);
            const result = this.containsCycles;
            this._connections.pop();
            return result;
        } else {
            return false;
        }
    }
    
    public get hasFreeNonNull(): boolean {
        return this
                   .outputs
                   .some(
                       output => {
                           return !output.nullable
                                  && !this.connections
                                          .some(
                                              connection => {
                                                  return connection.drainType == ConnectionDrainType.OUTPUT
                                                         && connection.outputName == output.name;
                                              });
                       }
                   )
               || this
                   .nodes
                   .some(
                       node => {
                           return node.inputs
                                      .some(input => {
                                                return !input.nullable
                                                       && !this.connections
                                                               .some(connection => {
                                                                   return connection.drainType == ConnectionDrainType.NODE
                                                                          && connection.drainNodeInputName == input.name;
                                                               });
                                            }
                                      );
                       }
                   );
    }
    
    public getInputByNodeAndName(nodeId: number, inputName: string): Datum | null {
        const node = this._nodes.find(otherNode => otherNode.id == nodeId);
        if (node != null) {
            return node.inputs.find(input => input.name == inputName) ?? null;
        }
        return null;
    }
    
    public renameImportOriginName(oldOrigin: DatumOrigin, oldName: string, newName: string, newDisplayName: string): void {
        for (const imp of this._imports) {
            if ((imp.origin == oldOrigin) && imp.originName == oldName) {
                const oldUniqueName   = imp.uniqueName;
                imp.originName        = newName;
                imp.originDisplayName = newDisplayName;
                const input           = this._inputs.find(otherInput => otherInput.name == oldUniqueName);
                if (input != null) {
                    input.name = imp.uniqueName;
                    this._connections.forEach(connection => {
                        if (connection.sourceType == ConnectionSourceType.INPUT && connection.inputName == oldUniqueName) {
                            connection.inputName = imp.uniqueName;
                        }
                    });
                }
            }
        }
    }
    
    public toJSON(): MixJSON {
        return {
            id:          this.id,
            inputs:      this._inputs.slice().map(input => input.toJSON()),
            outputs:     this._outputs.slice().map(output => output.toJSON()),
            nodes:       this._nodes.map(node => node.toJSON()),
            connections: this._connections.map(connection => ConnectionJSON.fromConnection(connection)),
            imports:     this._imports.slice().map(input => input.toJSON())
        };
    }
    
    public static fromJSON(mixJson: MixJSON): Mix {
        const mix        = new Mix(mixJson.id);
        mix._inputs      = mixJson.inputs.map(input => Datum.fromJSON(input));
        mix._outputs     = mixJson.outputs.map(output => Datum.fromJSON(output));
        mix._nodes       = mixJson.nodes.map(node => ElaborationNode.fromJSON(node));
        mix._connections = mixJson.connections.map(connection => ConnectionJSON.toConnection(connection));
        mix._imports     = mixJson.imports.map(input => ExportedDatum.fromJSON(input));
        return mix;
    }
}

export class MixJSON {
    
    @IsDefined()
    @ValidateIf((obj: MixJSON) => obj.id !== "NEW")
    @Min(0)
    @IsInt()
    public id: number | "NEW";
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumJSON)
    public inputs: DatumJSON[] = [];
    
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
    public connections: ConnectionJSON[] = [];
    
    constructor(id: number | "NEW") {
        this.id = id;
    }
}

export enum ConnectionSourceType {
    INPUT    = "INPUT",
    NODE     = "NODE",
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
    sourceValueType: DatumType
}

type ConnectionSource = ConnectionSourceFromInput | ConnectionSourceFromNode | ConnectionSourceFromConstant

export enum ConnectionDrainType {
    OUTPUT = "OUTPUT",
    NODE   = "NODE"
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
    @Min(0)
    public sourceNodeId?: number;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public sourceNodeOutputName?: string;
    
    @Allow()
    public sourceValue?: unknown;
    
    @IsEnum(DatumType)
    @IsOptional()
    public sourceValueType?: unknown;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public outputName?: string;
    
    @IsOptional()
    @IsInt()
    @Min(0)
    public drainNodeId?: number;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public drainNodeInputName?: string;
    
    constructor(sourceType: ConnectionSourceType, drainType: ConnectionDrainType) {
        this.sourceType = sourceType;
        this.drainType  = drainType;
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
                    return false;
                }
                break;
            case ConnectionSourceType.NODE:
                if (
                    connection.sourceValue != undefined ||
                    connection.sourceNodeId == undefined ||
                    connection.sourceNodeOutputName == undefined ||
                    connection.inputName != undefined
                ) {
                    return false;
                }
                break;
            case ConnectionSourceType.CONSTANT:
                if (
                    connection.sourceValue == undefined ||
                    connection.sourceNodeId != undefined ||
                    connection.sourceNodeOutputName != undefined ||
                    connection.inputName != undefined
                ) {
                    return false;
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
                    return false;
                }
                break;
            case ConnectionDrainType.NODE:
                if (
                    connection.drainNodeId == undefined ||
                    connection.drainNodeInputName == undefined ||
                    connection.outputName != undefined
                ) {
                    return false;
                }
                break;
        }
        return true;
    }
    
    public static toConnection(connectionJSON: ConnectionJSON): Connection {
        if (ConnectionJSON.isValid(connectionJSON)) {
            let sourceResult: ConnectionSource;
            let drainResult: ConnectionDrain;
            switch (connectionJSON.sourceType) {
                case ConnectionSourceType.INPUT: {
                    sourceResult = {
                        sourceType: ConnectionSourceType.INPUT,
                        inputName:  connectionJSON.inputName
                    };
                    break;
                }
                case ConnectionSourceType.NODE: {
                    sourceResult = {
                        sourceType:           ConnectionSourceType.NODE,
                        sourceNodeId:         connectionJSON.sourceNodeId,
                        sourceNodeOutputName: connectionJSON.sourceNodeOutputName
                    };
                    break;
                }
                case ConnectionSourceType.CONSTANT: {
                    sourceResult = {
                        sourceType:      ConnectionSourceType.CONSTANT,
                        sourceValue:     Datum.valueFromJSON(connectionJSON.sourceValue, connectionJSON.sourceValueType),
                        sourceValueType: connectionJSON.sourceValueType
                    };
                    break;
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
                        drainType:          ConnectionDrainType.NODE,
                        drainNodeId:        connectionJSON.drainNodeId,
                        drainNodeInputName: connectionJSON.drainNodeInputName
                    };
                    break;
                }
            }
            return {
                ...sourceResult,
                ...drainResult
            };
        } else {
            throw new Error("The collection provided is not valid");
        }
    }
    
    public static fromConnection(connection: Connection): ConnectionJSON {
        let result = new ConnectionJSON(connection.sourceType, connection.drainType);
        switch (connection.sourceType) {
            case ConnectionSourceType.INPUT: {
                result.inputName = connection.inputName;
                break;
            }
            case ConnectionSourceType.NODE: {
                result.sourceNodeId         = connection.sourceNodeId;
                result.sourceNodeOutputName = connection.sourceNodeOutputName;
                break;
            }
            case ConnectionSourceType.CONSTANT: {
                result.sourceValue     = Datum.valueToJSON(connection.sourceValue, connection.sourceValueType);
                result.sourceValueType = connection.sourceValueType;
                break;
            }
        }
        switch (connection.drainType) {
            case ConnectionDrainType.OUTPUT: {
                result.outputName = connection.outputName;
                break;
            }
            case ConnectionDrainType.NODE: {
                result.drainNodeId        = connection.drainNodeId;
                result.drainNodeInputName = connection.drainNodeInputName;
                break;
            }
        }
        return result;
    }
    
}
