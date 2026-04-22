/**
 * This module defines the {@link Mix|`Mix`} class and its related types and errors.
 *
 * @module
 */
import {Allow, IsArray, IsDefined, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, Type, ValidateIf, ValidateNested} from "rest-decorators";
import {Datum, DatumJSON, DatumOrigin, DatumType, ExportedDatum, ExportedDatumJSON} from "./datum";
import {ElaborationNode, ElaborationNodeJSON, ElaborationNodeRetrieve, ElaborationNodeSave, ElaborationNodeTimeout} from "./elaboration-node";

/**
 * The cause of a {@link MixCalculationError|`MixCalculationError`}.
 */
export enum MixCalculationErrorType {
    /** A cycle was detected in the connection between nodes in the mix. */
    CYCLIC_GRAPH      = "CYCLIC_GRAPH",
    /** Some connections between nodes are incorrectly set up. */
    WRONG_CONNECTIONS = "WRONG_CONNECTIONS",
    /** A referenced {@link ElaborationNode#id|`ElaborationNode.id`} does not correspond with any node present the mix. */
    UNKNOWN_NODE      = "UNKNOWN_NODE",
}

/**
 * A generic error thrown during {@link Mix#calculate|`Mix.calculate`}.
 */
export class MixCalculationError extends Error {
    /**
     * Creates an instance of the error.
     *
     * @param {MixCalculationErrorType} type - The cause of the new error.
     */
    constructor(
        public readonly type: MixCalculationErrorType) {
        super(`Error while calculating composition result. Error type ${type}`);
    }
}

/**
 * The cause of a {@link MixCalculationOutputError|`MixCalculationOutputError`}.
 */
export enum MixCalculationOutputErrorType {
    /** The calculation has not yielded an output defined in the mix. */
    MISSING_OUTPUT      = "MISSING_OUTPUT",
    /** The output resulting from the calculation is not of the type defined in the mix. */
    WRONG_OUTPUT_TYPE   = "WRONG_OUTPUT_TYPE",
    /** The calculation has yielded an output not defined in the mix. */
    UNKNOWN_OUTPUT_NAME = "UNKNOWN_OUTPUT_NAME",
}

/**
 * An error thrown during {@link Mix#calculate|`Mix.calculate`} when a mix's {@link Mix#outputs|`output`}
 * resulting from the calculation is wrong according to the outputs' definition.
 */
export class MixCalculationOutputError extends Error {
    /**
     * Creates an instance of the error.
     *
     * @param {MixCalculationOutputErrorType} type - The cause of the new error.
     * @param {string} outputName - The name of the output the error is about.
     */
    constructor(
        public readonly type: MixCalculationOutputErrorType,
        public readonly outputName: string) {
        super(`Error while calculating composition result. Error type ${type} on output ${outputName}`);
    }
}

/**
 * The cause of a {@link MixCalculationInputError|`MixCalculationInputError`}.
 */
export enum MixCalculationInputErrorType {
    /** The calculation requires an output not defined in the mix. */
    UNKNOWN_INPUT_NAME = "UNKNOWN_INPUT_NAME",
}

/**
 * An error thrown during {@link Mix#calculate|`Mix.calculate`} when a mix's {@link Mix#inputs|`input`}
 * required during the calculation is wrong, according to the inputs' definition.
 */
export class MixCalculationInputError extends Error {
    /**
     * Creates an instance of the error.
     *
     * @param {MixCalculationInputErrorType} type - The cause of the new error.
     * @param {string} input - The name of the output the error is about.
     */
    constructor(
        public readonly type: MixCalculationInputErrorType,
        public readonly input: string) {
        super(`Error while calculating composition result. Error type ${type} on input ${input}`);
    }
}

/**
 * This class represents a mix, a collection of operations in a certain order that transforms some {@link Mix#inputs|`inputs`}
 * into some {@link Mix#outputs|`outputs`}, through the use of {@link ElaborationNode|`ElaborationNode`s}, whose inputs and outputs
 * are connected between them and with the mix's inputs and outputs through a directed graph defined by the mix's {@link Mix#connections|`connections`}.
 */
export class Mix {
    
    /**
     * The mix's unique positive integer id. This id identifies the mix in the system so that its outputs
     * can be used by other mixes. It can be the string `"NEW"` to mark the fact that the mix has yet to be assigned
     * an id by the backend.
     */
    private _id: number | "NEW";
    
    /**
     * All the inputs the mix will use for its calculations.
     */
    private _inputs: Datum[]  = [];
    /**
     * All the outputs this mix will produce.
     */
    private _outputs: Datum[] = [];
    
    /**
     * For any {@link Mix#_inputs|`input`} this mix uses that comes from some other part of the system,
     * this list contains all the information to identify the origin of the input.
     */
    private _imports: ExportedDatum[] = [];
    
    /**
     * All the nodes this mix will use to calculate its results.
     */
    private _nodes: ElaborationNode[]  = [];
    /**
     * The connections between inputs, outputs and nodes in this mix.
     */
    private _connections: Connection[] = [];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number | "NEW"} id - Value for {@link Mix#id|`id`}.
     */
    constructor(id: number | "NEW") {
        this._id = id;
    }
    
    /**
     * The mix's unique positive integer id. This id identifies the mix in the system so that its outputs
     * can be used by other mixes. Can be the string `"NEW"` to mark the fact that the mix has yet to be assigned
     * an id by the backend.
     */
    public get id(): number | "NEW" {
        return this._id;
    }
    
    /**
     * Sets the mix's {@link Mix#id|`id`}. The id can only be changed from the value `"NEW"` to an integer,
     * so setting it will have an effect only if the  {@link Mix#id|`id`} is `"NEW"`, otherwise the old
     * id is kept.
     */
    public set id(value: number | "NEW") {
        if (this._id == "NEW") {
            this._id = value;
        }
    }
    
    /**
     * All the nodes this mix will use to calculate its results. This is a copy of the array of the nodes,
     * changing its structure will not change the mix's nodes (but changing the mixes directly will).
     * Use {@link Mix#addNode|`addNode`} or {@link Mix#removeNode|`removeNode`} to modify this list.
     *
     * @see {@link Mix#addNode|`addNode`}.
     * @see {@link Mix#removeNode|`removeNode`}.
     */
    public get nodes(): readonly ElaborationNode[] {
        return this._nodes.slice();
    }
    
    /**
     * Adds a node to this mix's {@link Mix#nodes|`nodes`}, if not already present.
     * This method will add a {@link Mix#connections|`connection`} from a default constant
     * to each non-nullable {@link ElaborationNode#inputs|`input`} of the node.
     *
     * @param {ElaborationNode} elaborationNode - The node to add.
     */
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
    
    /**
     * Removes a node from this mix's {@link Mix#nodes|`nodes`}, if present.
     * This will remove all the {@link Mix#connections|`connections`} with this node,
     * and replace the ones going to a non-nullable datum with connections
     * from a constant.
     *
     * @param {ElaborationNode} elaborationNode - The node to remove.
     */
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
    
    /**
     * This list contains all the outputs this mix will produce. This is a copy of the array of the outputs,
     * changing its structure will not change the mix's outputs (but changing the outputs directly will).
     * Use {@link Mix#addOutput|`addOutput`} or {@link Mix#removeOutput|`removeOutput`} to modify this list.
     *
     * @see {@link Mix#addOutput|`addOutput`}.
     * @see {@link Mix#removeOutput|`removeOutput`}.
     */
    public get outputs(): readonly Datum[] {
        return this._outputs.slice();
    }
    
    /**
     * Adds a new output to this mix's {@link Mix#outputs|`outputs`}.
     * This method will add a {@link Mix#connections|`connection`} from a default constant
     * to the output if non-nullable.
     *
     * @param {Datum} output - The output to add.
     */
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
    
    /**
     * Removes an output from this mix's {@link Mix#outputs|`outputs`}, if present.
     * This will remove all the {@link Mix#connections|`connections`} going to this output.
     *
     * @param {Datum} output - The output to remove.
     */
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
    
    /**
     * For any {@link Mix#inputs|`input`} this mix uses that comes from some other part of the system,
     * this list contains all the information to identify the origin of the input. This is a copy of the array of the imports,
     * changing its structure will not change the mix's imports (but changing the imports directly will). Use {@link Mix#addImport|`addImport`}
     * or {@link Mix#removeImport|`removeImport`} to modify this list.
     *
     * @see {@link Mix#addImport|`addImport`}.
     * @see {@link Mix#removeImport|`removeImport`}.
     */
    public get imports(): readonly ExportedDatum[] {
        return this._imports.slice();
    }
    
    /**
     * This list contains all inputs the mix will use for its calculations. This is a copy of the array of the inputs,
     * changing its structure will not change the mix's inputs (but changing the inputs directly will).
     * Inputs can't be changed directly, they are updated when adding {@link Mix#imports|`imports`}.
     */
    public get inputs(): readonly Datum[] {
        return this._inputs.slice();
    }
    
    /**
     * Adds an import to this mix's {@link Mix#outputs|`outputs`}, if not already present.
     * This method will add a {@link Mix#inputs|`input`} using the value from
     * {@link ExportedDatum#uniqueName|`ExportedDatum.uniqueName`} as the name.
     *
     * @param {ExportedDatum} imp - The import to add.
     */
    public addImport(imp: ExportedDatum): void {
        if (this._imports.includes(imp)) {
            return;
        }
        this._imports.push(imp);
        this._inputs.push(new Datum(imp.uniqueName, imp.type, imp.nullable));
    }
    
    /**
     * Removes an import from this mix's {@link Mix#outputs|`outputs`}, if present.
     * This will remove all the {@link Mix#connections|`connections`} coming from this
     * input, and replace the ones going to a non-nullable datum with connections
     * from a constant.
     *
     * @param {ExportedDatum} imp - The import to remove.
     */
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
    
    /**
     * This list contains all the connections between inputs, outputs and nodes in this mix, describing the correct flow of data in the mix.
     * This is a copy of the array of the connections, changing its structure will not change the mix's connections (but changing the connections directly will).
     * Use {@link Mix#addConnection|`addConnection`} or {@link Mix#removeConnection|`removeConnection`} to modify this list.
     *
     * @see {@link Mix#addConnection|`addConnection`}.
     * @see {@link Mix#removeConnection|`removeConnection`}.
     *
     */
    public get connections(): readonly Connection[] {
        return this._connections.slice();
    }
    
    /**
     * Adds a connection to this mix's {@link Mix#connections|`connections`}, if not already present.
     * In case the connection supplied to this method has the same output as an already existing connection, the old
     * conflicting connection is removed and replaced with the one supplied here.
     *
     * @param {Connection} connection - The connection to add.
     */
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
    
    /**
     * Removes a connection to this mix's {@link Mix#connections|`connections`}, if present.
     * In case the connection to be deleted is flowing into a non-nullable datum, it will
     * be replaced by a connection to that datum from a constant. It's not possible to remove
     * a connection from a constant to a non-nullable datum without it being recreated, to
     * ensure non-nullability in the calculation of the mix.
     *
     * @param {Connection} connection - The connection to remove.
     */
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
    
    /**
     * Performs the calculation of the mix's {@link Mix#outputs|`outputs`} given its {@link Mix#inputs|`inputs`},
     * handling input validation, {@link Mix#nodes|`node`} elaboration according to the {@link Mix#connections|`connections`}
     * between them and inputs/outputs and output generation.
     *
     * @param {Map<string, unknown>} inputValues - A map containing the input values from the system at this point of the calculation,
     *                                             where keys are import names and values are their value.
     * @param {MixingStorage} storage - The storage object used by storage elaboration nodes to persist and retrieve data.
     * @param {number[]} timedOut - An array containing the node creation timestamps of timeout nodes that have timed out since the last time the system has been calculated.
     * @returns {MixingCalculationResult} - The result of the mixing calculation containing outputs, storage updates, new timeouts and node-specific outputs.
     * @throws {MixCalculationError} - {@link MixCalculationError|`MixCalculationError`} If the network of the mix is erroneous.
     * @throws {MixCalculationInputError} - {@link MixCalculationInputError|`MixCalculationInputError`} if some of the provided input data is erroneous or insufficient for the mix,
     *                                      according to the mix's {@link Mix#inputs|`inputs`}.
     * @throws {MixCalculationOutputError} - {@link MixCalculationOutputError|`MixCalculationOutputError`} if the outputs obtained after the calculation don't comply
     *                                       with the  {@link Mix#outputs|`outputs`} defined in the mix.
     */
    public calculate(inputValues: Map<string, unknown>, storage: MixingStorage, timedOut: number[]): MixingCalculationResult {
        if (this.containsCycles) {
            throw new MixCalculationError(MixCalculationErrorType.CYCLIC_GRAPH);
        }
        if (this.wrongConnections.length > 0) {
            throw new MixCalculationError(MixCalculationErrorType.WRONG_CONNECTIONS);
        }
        const knownInputs: Map<number, Map<string, unknown>> = new Map<number, Map<string, unknown>>();
        const discoveredNodes: Set<ElaborationNode> = new Set<ElaborationNode>(this.sourceNodes);
        const result: MixingCalculationResult       = {
            outputs:       new Map<string, unknown>(),
            storageUpdate: [],
            newTimeouts: [],
            nodeOutputs:   {}
        };
        
        const addOutput = (connection: Connection, value: unknown): void => {
            if (connection.drainType == ConnectionDrainType.OUTPUT) {
                if (this._outputs.some(output => output.name == connection.outputName)) {
                    result.outputs.set(connection.outputName, value);
                } else {
                    throw new MixCalculationOutputError(MixCalculationOutputErrorType.UNKNOWN_OUTPUT_NAME, connection.outputName);
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
                    throw new MixCalculationError(MixCalculationErrorType.UNKNOWN_NODE);
                }
                discoveredNodes.add(node);
            }
        };
        
        for (const connection of this.sourceConnections) {
            if (inputValues.has(connection.inputName)) {
                addOutput(connection, inputValues.get(connection.inputName));
            } else {
                throw new MixCalculationInputError(MixCalculationInputErrorType.UNKNOWN_INPUT_NAME, connection.inputName);
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
                // Check if every input is known or it's a nullable input without any inbound connection
                if (
                    node
                        .inputs
                        .every(input => {
                                   if (nodeKnownInputs.has(input.name)) {
                                       return true;
                                   }
                                   if (input.nullable) {
                                       if (!this.connections.some(connection => connection.drainType == ConnectionDrainType.NODE && connection.drainNodeId == node.id &&
                                                                                connection.drainNodeInputName == input.name)) {
                                           return true;
                                       }
                                   }
                                   return false;
                               }
                        )
                ) {
                    // If it is, we advance the discovery by adding to the known inputs the outputs of this node
                    unchanged = false;
                    // If it's a node that retrieves from storage, we need to pass the storage
                    if (node instanceof ElaborationNodeRetrieve) {
                        node.allSaves = storage;
                    }
                    if (node instanceof ElaborationNodeTimeout) {
                        node.hasTimedOut = timedOut.includes(node.options.creationTimestamp);
                        console.log(`The node has${node.hasTimedOut ? "" : " not"} timed out.`);
                    }
                    for (const input of node.inputs) {
                        if (!nodeKnownInputs.has(input.name)) {
                            nodeKnownInputs.set(input.name, null);
                        }
                    }
                    const outputs: Map<string, unknown> = node.elaborate(nodeKnownInputs);
                    const outputObject                  = {};
                    result.nodeOutputs[node.id]         = outputObject;
                    for (const nodeOutput of node.outputs) {
                        outputObject[nodeOutput.name] = Datum.valueToJSON(outputs.get(nodeOutput.name), nodeOutput.type);
                    }
                    if (node instanceof ElaborationNodeSave) {
                        const lastElaborationSave = node.lastElaborationSave;
                        if (lastElaborationSave != null) {
                            result.storageUpdate.push({
                                                          datumType: node.options.dataType,
                                                          name:      lastElaborationSave.name,
                                                          value:     lastElaborationSave.value
                                                      });
                        }
                    }
                    if (node instanceof ElaborationNodeTimeout) {
                        if (node.nextTrigger != null) {
                            result.newTimeouts.push(
                                {
                                    expiration:            node.nextTrigger,
                                    nodeCreationTimestamp: node.options.creationTimestamp
                                });
                        }
                    }
                    // Get all the outgoing connections to update
                    for (const connection of this.getConnectionsFromNode(node.id)) {
                        addOutput(connection, outputs.get(connection.sourceNodeOutputName));
                    }
                    discoveredNodes.delete(node);
                }
            }
        } while (!unchanged && discoveredNodes.size > 0);
        
        for (const output of this._outputs) {
            if (!result.outputs.has(output.name) && !output.nullable) {
                throw {type: MixCalculationOutputErrorType.MISSING_OUTPUT, outputName: output.name} as MixCalculationOutputError;
            }
            const outputValue = result.outputs.get(output.name) ?? null;
            if (!output.checkValue(outputValue)) {
                throw {type: MixCalculationOutputErrorType.WRONG_OUTPUT_TYPE, outputName: output.name} as MixCalculationOutputError;
            }
        }
        
        return result;
    }
    
    /**
     * All the connections that start from a mix's input.
     */
    public get sourceConnections(): (ConnectionSourceFromInput & ConnectionDrain)[] {
        return this._connections.filter((connection: Connection): connection is ConnectionSourceFromInput & ConnectionDrain => {
            return connection.sourceType == ConnectionSourceType.INPUT;
        });
    }
    
    /**
     * All the connections that start from a constant.
     */
    public get constantConnections(): (ConnectionSourceFromConstant & ConnectionDrain)[] {
        return this._connections.filter((connection: Connection): connection is ConnectionSourceFromConstant & ConnectionDrain => {
            return connection.sourceType == ConnectionSourceType.CONSTANT;
        });
    }
    
    /**
     * Gets all the connections originating from a specific node.
     *
     * @param {number} nodeId - The id of the node to get the connections from.
     * @returns {ConnectionSourceFromNode & ConnectionDrain} - The connections.
     */
    public getConnectionsFromNode(nodeId: number): (ConnectionSourceFromNode & ConnectionDrain)[] {
        return this
            ._connections
            .filter((connection: Connection): connection is ConnectionSourceFromNode & ConnectionDrain => {
                return connection.sourceType == ConnectionSourceType.NODE && connection.sourceNodeId == nodeId;
            });
    }
    
    /**
     * Given a connection from this mix, returns the definition of the datum the connection is pointing to.
     *
     * @param {Connection} connection - The connection to get the datum from.
     * @returns {Datum | null} - The datum the connection is pointing to, or `null` if the connection is pointing to an unknown datum.
     * @throws {Error} - If the connection is not part of this mix.
     */
    public getDrainDatum(connection: Connection): Datum | null {
        if (!this._connections.includes(connection)) {
            throw new Error("The connection is not part of this mix.");
        }
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
    
    /**
     * Given a connection from this mix, returns the definition of the datum the connection is coming from.
     *
     * @param {Connection} connection - The connection to get the datum from.
     * @returns {Datum | null} The datum the connection is coming from, or `null` if the connection is coming from a constant or an unknown datum.
     * @throws {Error} If the connection is not part of this mix.
     */
    public getSourceDatum(connection: Connection): Datum | null {
        if (!this._connections.includes(connection)) {
            throw new Error("The connection is not part of this mix.");
        }
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
    
    /**
     * Retrieves the list of connections in this mix that are considered invalid or incorrect based on specific conditions.
     *
     * The method evaluates each {@link Mix#connections|`connection`} in the mix and applies validation checks
     * to determine whether it qualifies as a wrong connection.
     *
     * A connection is considered invalid if:
     * - The drain pointed to by the connection is unknown.
     * - For constant source connections, the chosen constant value does not match the type of the drain.
     * - For node or input source connections:
     *   - The source datum is unknown
     *   - The drain datum is non-nullable, but the source datum is nullable.
     *   - The types of the drain datum and source datum do not match.
     *
     * @returns {Connection[]} An array of invalid or incorrect connections.
     */
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
    
    /**
     * Determines if the graph represented by the source nodes contains any cycles.
     *
     * @returns {boolean} `true` if the graph contains at least one cycle, `false` otherwise.
     */
    public get containsCycles(): boolean {
        const firstChildren = new Set<number>(
            this.sourceNodes
                .map(node => node.id)
        );
        for (const firstChild of firstChildren) {
            if (this.checkCycleDepth(new Set<number>(), firstChild)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Retrieves all source nodes from the current node collection. A source node
     * is defined as a node that has no incoming connections from any other node.
     *
     * @returns {ElaborationNode[]} An array of source nodes filtered from the set of nodes.
     */
    private get sourceNodes(): ElaborationNode[] {
        return this
            ._nodes
            .filter(
                node =>
                    this
                        ._connections
                        .filter(
                            connection =>
                                connection.drainType == ConnectionDrainType.NODE
                                && connection.drainNodeId == node.id
                                && connection.sourceType == ConnectionSourceType.NODE
                        ).length == 0
            );
    }
    
    /**
     * This is the recursive function that implements the cycle detection algorithm. The function
     * scans one single depth layer from a single node, calling itself on all the nodes immediately
     * downstream from it, and fails the cyclicity check if an already visited node is encountered
     * downstream.
     *
     * @param {Set<number>} passed - The set of node IDs that have already been visited in the current path.
     * @param {number} current - The ID of the current node being checked for cycles.
     * @returns {boolean} Returns `true` if a cycle is detected in the subgraph originating from the node, `false` otherwise.
     */
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
    
    /**
     * Determines whether adding a specified connection would introduce a cycle in the existing connections.
     *
     * @param {Connection} connection - The connection to be evaluated for potential cycle formation.
     * @returns {boolean} - Returns `true` if adding the connection results in a cycle, `false` otherwise.
     */
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
    
    /**
     * Determines if there are any free (without an incoming connection), non-nullable mix outputs or node inputs in the current structure.
     *
     * @returns {boolean} `true` if there exists at least one mix output or node input that is not nullable and is not connected, `false` otherwise.
     */
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
    
    /**
     * Whether all the possible drains for a connection (input to nodes and mix outputs) have at most one inbound connection, i.e.,
     * all the connections are unique on the drain side.
     *
     * @returns {boolean} `true` if all inbound connections are unique, `false` otherwise.
     */
    public get uniqueInboundConnections(): boolean {
        for (const connection of this._connections) {
            if (connection.drainType == ConnectionDrainType.NODE) {
                if (this._connections.some(
                    otherConnection =>
                        otherConnection != connection
                        && otherConnection.drainType == ConnectionDrainType.NODE
                        && otherConnection.drainNodeId == connection.drainNodeId
                        && otherConnection.drainNodeInputName == connection.drainNodeInputName)
                ) {
                    return false;
                }
            } else { // ConnectionDrainType.OUTPUT
                if (this._connections.some(
                    otherConnection =>
                        otherConnection != connection
                        && otherConnection.drainType == ConnectionDrainType.OUTPUT
                        && otherConnection.outputName == connection.outputName
                )) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * Retrieves the {@link Datum|`Datum`} corresponding to an input of a node by its associated node ID and input name.
     *
     * @param {number} nodeId - The unique identifier of the node.
     * @param {string} inputName - The name of the input to retrieve.
     * @returns {Datum | null} The input object if found, or `null` if no matching input exists.
     */
    public getInputByNodeAndName(nodeId: number, inputName: string): Datum | null {
        const node = this._nodes.find(otherNode => otherNode.id == nodeId);
        if (node != null) {
            return node.inputs.find(input => input.name == inputName) ?? null;
        }
        return null;
    }
    
    /**
     * Renames the origin name and display name of an import within the current context, updates related inputs and connections as necessary.
     *
     * @param {DatumOrigin} oldOrigin - The previous origin to identify the import to be renamed.
     * @param {string} oldName - The original name of the import to be renamed.
     * @param {string} newName - The new name to replace the original import name.
     * @param {string} newDisplayName - The new display name to replace the original import display name.
     */
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
    
    /**
     * Moves an imported datum within the list of imports either forwards or backwards.
     *
     * @param {ExportedDatum} datum - The import item to be moved.
     * @param {boolean} forwards - Indicates the direction of movement.
     *                             If true, the datum is moved forward (towards a higher index).
     *                             If false, the datum is moved backward (towards a lower index).
     */
    public moveImport(datum: ExportedDatum, forwards: boolean): void {
        const index = this._imports.indexOf(datum);
        if (index == -1) {
            return;
        }
        const newIndex = forwards ? index + 1 : index - 1;
        if (newIndex < 0 || newIndex >= this._imports.length) {
            return;
        }
        const substitute = this._imports.splice(newIndex, 1, datum)[0];
        if (substitute) {
            this._imports.splice(index, 1, substitute);
        }
    }
    
    /**
     * Moves the specified output datum to a new position within the outputs array.
     * The position is determined by the direction specified (forwards or backwards).
     *
     * @param {Datum} datum - The datum object to be moved within the outputs array.
     * @param {boolean} forwards - Indicates the direction of movement.
     *                             If true, the datum is moved forward (towards a higher index).
     *                             If false, the datum is moved backward (towards a lower index).
     */
    public moveOutput(datum: Datum, forwards: boolean): void {
        const index = this._outputs.indexOf(datum);
        if (index == -1) {
            return;
        }
        const newIndex = forwards ? index + 1 : index - 1;
        if (newIndex < 0 || newIndex >= this._outputs.length) {
            return;
        }
        const substitute = this._outputs.splice(newIndex, 1, datum)[0];
        if (substitute) {
            this._outputs.splice(index, 1, substitute);
        }
    }
    
    /**
     * Converts the mix instance into its JSON representation.
     *
     * @returns {MixJSON} The JSON representation of `this`.
     */
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
    
    /**
     * Constructs a new {@link Mix|`Mix`} instance from a given JSON representation.
     *
     * @param {MixJSON} mixJSON - The JSON representation of the mix.
     * @returns {Mix} The mix object constructed from the provided JSON.
     */
    public static fromJSON(mixJSON: MixJSON): Mix {
        const mix        = new Mix(mixJSON.id);
        mix._inputs      = mixJSON.inputs.map(input => Datum.fromJSON(input));
        mix._outputs     = mixJSON.outputs.map(output => Datum.fromJSON(output));
        mix._nodes       = mixJSON.nodes.map(node => ElaborationNode.fromJSON(node));
        mix._connections = mixJSON.connections.map(connection => ConnectionJSON.toConnection(connection));
        mix._imports     = mixJSON.imports.map(input => ExportedDatum.fromJSON(input));
        return mix;
    }
}

/**
 * The serialization of the class {@link Mix|`Mix`}.
 */
export class MixJSON {
    
    /**
     * Serialization of the property {@link Mix#id|`id`}.
     */
    @IsDefined()
    @ValidateIf((obj: MixJSON) => obj.id !== "NEW")
    @Min(0)
    @IsInt()
    public id: number | "NEW";
    
    
    /**
     * Serialization of the property {@link Mix#inputs|`inputs`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumJSON)
    public inputs: DatumJSON[] = [];
    
    /**
     * Serialization of the property {@link Mix#outputs|`outputs`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumJSON)
    public outputs: DatumJSON[] = [];
    
    /**
     * Serialization of the property {@link Mix#id|`id`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => ExportedDatumJSON)
    public imports: ExportedDatumJSON[] = [];
    
    /**
     * Serialization of the property {@link Mix#nodes|`nodes`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => ElaborationNodeJSON)
    public nodes: ElaborationNodeJSON[] = [];
    
    /**
     * Serialization of the property {@link Mix#connections|`connections`}.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => ConnectionJSON)
    public connections: ConnectionJSON[] = [];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link Mix#id|`id`}.
     */
    constructor(id: number | "NEW") {
        this.id = id;
    }
}

/**
 * This enum describes the types of {@link Connection|`Connection`} on the source side.
 */
export enum ConnectionSourceType {
    /** The connection originates from a {@link Mix#inputs|mix's input}. */
    INPUT    = "INPUT",
    /** The connection originates from a {@link ElaborationNode#outputs|node's output}. */
    NODE     = "NODE",
    /** The connection assigns a constant to its drain. */
    CONSTANT = "CONST"
}

/**
 * This interface describes the source side of a {@link Connection|`Connection`} that is originating from an input.
 */
export interface ConnectionSourceFromInput {
    /** The source type of this connection. */
    sourceType: ConnectionSourceType.INPUT;
    /** The name of the {@link Mix#inputs|mix's input} the connection originates from. */
    inputName: string;
}

/**
 * This interface describes the source side of a {@link Connection|`Connection`} that is originating from a node.
 */
export interface ConnectionSourceFromNode {
    /** The source type of this connection. */
    sourceType: ConnectionSourceType.NODE;
    /** The id of the node the connection originates from. */
    sourceNodeId: number,
    /** The name of the node's {@link ElaborationNode#outputs|output} the connection originates from. */
    sourceNodeOutputName: string,
}

/**
 * This interface describes the source side of a {@link Connection|`Connection`} that assigns a constant to its drain.
 */
export interface ConnectionSourceFromConstant {
    /** The source type of this connection. */
    sourceType: ConnectionSourceType.CONSTANT;
    /** The constant value to be assigned to the connection's drain. */
    sourceValue: unknown,
    /** The type of the constant value, for type checking with the drain. */
    sourceValueType: DatumType
}

/**
 * This type describes the source side of a {@link Connection|`Connection`}.
 */
export type ConnectionSource = (ConnectionSourceFromInput | ConnectionSourceFromNode | ConnectionSourceFromConstant)

/**
 * This enum describes the types of {@link Connection|`Connection`} on the drain side.
 */
export enum ConnectionDrainType {
    /** The connection points to a {@link Mix#outputs|mix's output}. */
    OUTPUT = "OUTPUT",
    /** The connection points to a {@link ElaborationNode#inputs|node's input}. */
    NODE   = "NODE"
}

/**
 * This interface describes the drain side of a {@link Connection|`Connection`} that is pointing to a {@link Mix#outputs|mix's output}.
 */
export interface ConnectionDrainToOutput {
    /** The drain type of this connection. */
    drainType: ConnectionDrainType.OUTPUT;
    /** The name of the {@link Mix#outputs|mix's output} the connection points to. */
    outputName: string;
}

/**
 * This interface describes the drain side of a {@link Connection|`Connection`} that is pointing to a {@link ElaborationNode#inputs|node's input}.
 */
export interface ConnectionDrainToNode {
    /** The drain type of this connection. */
    drainType: ConnectionDrainType.NODE,
    /** The id of the node the connection points to. */
    drainNodeId: number,
    /** The name of the node's {@link ElaborationNode#inputs|input} the connection points to. */
    drainNodeInputName: string,
}

/**
 * This type describes the drain side of a {@link Connection|`Connection`}.
 */
export type ConnectionDrain = ConnectionDrainToOutput | ConnectionDrainToNode

/**
 * In the context of a {@link Mix|`Mix`}, a connection links two {@link Datum|`Datum`}s so that the flow of data can be passed
 * among {@link ElaborationNode|`ElaborationNode`s}, mixes' {@link Mix#outputs|outputs} and {@link Mix#inputs|inputs}, and
 * constant values. Every connection originates from a {@link ConnectionSource|source} (the datum from which the value comes
 * from) and points too a {@link ConnectionDrain|drain} (the datum to which the value is sent).
 */
export type Connection = ConnectionSource & ConnectionDrain;

/**
 * In the context of a {@link Mix#calculate|mix's calculation}, there may be the need to persistently store some {@link Datum|`Datum`}
 * to be recalled in some later calculation. This type defines the structure to hold all this data for an entire system. Saved data is
 * separated into its datum type, and is contained in a map of names.
 */
export type MixingStorage = Record<DatumType, Map<string, unknown>>;

/**
 * The serialization of the type {@link MixingStorage|`MixingStorage`}. This definition is identical to its counterpart
 * but is defined separately to highlight the fact that there must be a serialization step between the two, since the inner record
 * type is unknown for both types, but the actual values should be transformed between the two.
 */
export type MixingStorageJSON = Record<DatumType, Record<string, unknown>>

/**
 * Converts a mixing storage instance into its JSON representation, taking into
 * account the correct serialization of {@link Datum|`Datum`s}.
 *
 * @param {MixingStorage} storage - The mixing storage instance to serialize.
 * @returns {MixingStorageJSON} The JSON representation of the input.
 */
export function mixingStorageToJSON(storage: MixingStorage): MixingStorageJSON {
    
    const result = {} as MixingStorageJSON;
    for (const datumType of Object.values(DatumType)) {
        result[datumType] =
            Object.fromEntries(
                [...storage[datumType].entries()]
                    .map(entry =>
                             [
                                 entry[0],
                                 Datum.valueToJSON(
                                     entry[1],
                                     datumType
                                 )
                             ]
                    )
            );
        
    }
    return result;
}

/**
 * Used to indicate that a {@link Mix#calculate|mix's calculation} has resulted in a new value for a specific storage variable.
 */
export interface StorageUpdate {
    /** The type of the value being updated. */
    datumType: DatumType,
    /** The unique name identifying the variable being updated. */
    name: string,
    /** The new value. */
    value: unknown
}

/**
 * The serialization of the interface {@link StorageUpdate|`StorageUpdate`}. This definition is identical to its counterpart
 * but is defined separately to highlight the fact that there must be a serialization step between the two, since the inner record
 * type is unknown for both types, but the actual values should be transformed between the two.
 */
export interface StorageUpdateJSON {
    /** Serialization of the property {@link StorageUpdate#datumType|`datumType`}. */
    datumType: DatumType,
    /** Serialization of the property {@link StorageUpdate#name|`name`}. */
    name: string,
    /** Serialization of the property {@link StorageUpdate#value|`value`}. */
    value: unknown
}

/**
 * Converts a storage update instance into its JSON representation, taking into
 * account the correct serialization of {@link Datum|`Datum`s}.
 *
 * @param {StorageUpdate} storageUpdate - The mixing storage instance to serialize.
 * @returns {StorageUpdateJSON} The JSON representation of the input.
 */
export function storageUpdateToJSON(storageUpdate: StorageUpdate): StorageUpdateJSON {
    return {
        datumType: storageUpdate.datumType,
        name:      storageUpdate.name,
        value:     Datum.valueToJSON(storageUpdate.value, storageUpdate.datumType)
    };
}

/**
 * Constructs a new {@link StorageUpdate|`StorageUpdate`} instance from a given JSON representation, taking into
 * account the correct serialization of {@link Datum|`Datum`s}.
 *
 * @param {StorageUpdateJSON} storageUpdateJSON - The JSON representation of the storage update.
 * @returns {StorageUpdate} The storage update object constructed from the provided JSON.
 */
export function storageUpdateFromJSON(storageUpdateJSON: StorageUpdateJSON): StorageUpdate {
    return {
        datumType: storageUpdateJSON.datumType,
        name:      storageUpdateJSON.name,
        value:     Datum.valueFromJSON(storageUpdateJSON.value, storageUpdateJSON.datumType)
    };
}


/**
 * Represents a timeout scheduled by a node in a mix.
 */
export interface MixNodeTimeout {
    /**
     * The calculated next timeout.
     *
     * @see {@link ElaborationNodeTimeout#nextTrigger|`ElaborationNodeTimeout.nextTrigger`}.
     */
    expiration: number;
    /** The unique creation timestamp of the node that scheduled this timeout. */
    nodeCreationTimestamp: number;
}

/**
 * Interface to collect all the results from a {@link Mix#calculate|`mix's calculation`}.
 */
export interface MixingCalculationResult {
    /** A map containing the calculated values for each {@link Mix#outputs|mix's output}. */
    outputs: Map<string, unknown>;
    /** A list of updates to be applied to the persistent storage. */
    storageUpdate: StorageUpdate[];
    /** A list of new timeouts scheduled by some nodes during this calculation. */
    newTimeouts: MixNodeTimeout[];
    /**
     * A record of the outputs produced by each {@link Mix#nodes|mix's node} during elaboration,
     * indexed by node ID and then by output name.
     */
    nodeOutputs: Record<number, Record<string, unknown>>;
}

/**
 * The serialization of the class {@link MixingCalculationResult|`MixingCalculationResult`}. This definition is identical to its counterpart
 * but is defined separately to highlight the fact that there must be a serialization step between the two, since the inner record
 * type is unknown for both types, but the actual values should be transformed between the two.
 */
export interface MixingCalculationResultJSON {
    /** Serialization of the property {@link MixingCalculationResult#outputs|`outputs`}. */
    outputs: Record<string, unknown>;
    /** Serialization of the property {@link MixingCalculationResult#storageUpdate|`storageUpdate`}. */
    storageUpdate: StorageUpdateJSON[];
    /** Serialization of the property {@link MixingCalculationResult#newTimeouts|`newTimeouts`}. */
    newTimeouts: MixNodeTimeout[];
    /** Serialization of the property {@link MixingCalculationResult#nodeOutputs|`nodeOutputs`}. */
    nodeOutputs: Record<number, Record<string, unknown>>;
}


/**
 * Converts a mixing calculation result instance into its JSON representation, taking into
 * account the correct serialization of {@link Datum|`Datum`s}.
 *
 * @param {MixingCalculationResult} result - The mixing storage instance to serialize.
 * @returns {MixingCalculationResultJSON} The JSON representation of the input.
 */
export function mixingCalculationResultToJSON(result: MixingCalculationResult): MixingCalculationResultJSON {
    return {
        outputs:       Object.fromEntries(result.outputs),
        storageUpdate: result.storageUpdate.map(storageUpdateToJSON),
        newTimeouts: result.newTimeouts,
        nodeOutputs:   result.nodeOutputs
    };
}

/**
 * Constructs a new {@link MixingCalculationResult|`MixingCalculationResult`} instance from a given JSON representation, taking into
 * account the correct serialization of {@link Datum|`Datum`s}.
 *
 * @param {MixingCalculationResultJSON} resultJSON - The JSON representation of the mixing calculation result.
 * @returns {MixingCalculationResult} The mixing calculation result object constructed from the provided JSON.
 */
export function mixingCalculationResultFromJSON(resultJSON: MixingCalculationResultJSON): MixingCalculationResult {
    return {
        outputs:       new Map(Object.entries(resultJSON.outputs)),
        storageUpdate: resultJSON.storageUpdate.map(storageUpdateFromJSON),
        newTimeouts: resultJSON.newTimeouts,
        nodeOutputs:   resultJSON.nodeOutputs
    };
}

/**
 * The serialization of the class {@link Connection|`Connection`}.
 */
export class ConnectionJSON {
    
    /** Serialization of the property {@link ConnectionSource|`ConnectionSource.sourceType`}. */
    @IsEnum(ConnectionSourceType)
    public sourceType: ConnectionSourceType;
    
    /** Serialization of the property {@link ConnectionDrain|`ConnectionSource.drainType`}. */
    @IsEnum(ConnectionDrainType)
    public drainType: ConnectionDrainType;
    
    /** Serialization of the property {@link ConnectionSourceFromInput#inputName|`inputName`}. */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public inputName?: string;
    
    /** Serialization of the property {@link ConnectionSourceFromNode#sourceNodeId|`sourceNodeId`}. */
    @IsOptional()
    @IsInt()
    @Min(0)
    public sourceNodeId?: number;
    
    /** Serialization of the property {@link ConnectionSourceFromNode#sourceNodeOutputName|`sourceNodeOutputName`}. */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public sourceNodeOutputName?: string;
    
    /** Serialization of the property {@link ConnectionSourceFromConstant#sourceValue|`sourceValue`}. */
    @Allow()
    public sourceValue?: unknown;
    
    /** Serialization of the property {@link ConnectionSourceFromConstant#sourceValueType|`sourceValueType`}. */
    @IsEnum(DatumType)
    @IsOptional()
    public sourceValueType?: unknown;
    
    /** Serialization of the property {@link ConnectionDrainToOutput#outputName|`outputName`}. */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public outputName?: string;
    
    /** Serialization of the property {@link ConnectionDrainToNode#drainNodeId|`drainNodeId`}. */
    @IsOptional()
    @IsInt()
    @Min(0)
    public drainNodeId?: number;
    
    /** Serialization of the property {@link ConnectionDrainToNode#drainNodeInputName|`drainNodeInputName`}. */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public drainNodeInputName?: string;
    
    /**
     * Creates an instance of the class.
     *
     * @param {ConnectionSourceType} sourceType - Value for {@link ConnectionSource|`ConnectionSource.sourceType`}.
     * @param {ConnectionDrainType} drainType - Value for {@link ConnectionDrain|`ConnectionSource.drainType`}.
     */
    constructor(sourceType: ConnectionSourceType, drainType: ConnectionDrainType) {
        this.sourceType = sourceType;
        this.drainType  = drainType;
    }
    
    /**
     * Validates the provided serialization of a `Connection` to ensure it adheres to the expected structure based on its source and drain types.
     *
     * @param {ConnectionJSON} connection - The connection object to validate.
     * @returns {boolean} Returns `true` if the object is a valid `Connection`, `false` otherwise.
     */
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
    
    /**
     * Creates a {@link Connection|`Connection`} instance from its serialization.
     *
     * @param {ConnectionJSON} connectionJSON - The JSON object to deserialize.
     * @returns {Connection} The deserialized class.
     * @throws {Error} - If the JSON provided is not a valid {@link Connection|`Connection`}.
     */
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
    
    /**
     * Converts a {@link Connection|`Connection`} instance into its JSON representation.
     *
     * @param {Connection} connection - The object to serialize.
     * @returns {ConnectionJSON} The JSON representation of the input.
     */
    public static fromConnection(connection: Connection): ConnectionJSON {
        const result = new ConnectionJSON(connection.sourceType, connection.drainType);
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
