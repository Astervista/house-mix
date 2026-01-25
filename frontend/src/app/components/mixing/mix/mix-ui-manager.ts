import {Point} from '@angular/cdk/drag-drop';
import {ElaborationNode} from '@common/mixing/mix/elaboration-node';
import {Connection, ConnectionDrainType, ConnectionSourceType, Mix} from '@common/mixing/mix/mix';
import {Datum, DatumInfo, ElaborationNodeDatum, ExportedDatum} from '@common/mixing/mix/datum';

interface Line {
    from: Point;
    to: Point;
}

export class MixUiManager {

    public translation: Point = {x: MEASURES.SECTIONS_SEPARATOR + MEASURES.INPUT_WIDTH, y: 0};
    public scale: number      = 1;

    private nodePositions: Map<ElaborationNode, Point> = new Map<ElaborationNode, Point>();
    private maxNodeXPosition: number                   = 0;

    private connections: Map<Connection, Line> = new Map<Connection, Line>();

    private lockedInputs: ElaborationNodeDatum[] = [];
    private lockedExternalOutputs: Datum[]       = [];

    public mix: Mix | null = null;

    public availableExportsLength: number | null = null;

    public svgElement: HTMLElement | null = null;

    public refreshMix(): void {
        // Sometimes changes made to the mix are not catchable. This function refreshes these changes
        const mix = this.mix;
        if (mix == null) {
            return;
        }
        this.maxNodeXPosition = mix
            .nodes
            .reduce((acc, val) => Math.max(acc, this.getNodePosition(val).x + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2), 0);
        for (const node of this.nodePositions.keys()) {
            if (!mix.nodes.includes(node)) {
                this.nodePositions.delete(node);
            }
        }
        for (const connection of this.connections.keys()) {
            if (!mix.connections.includes(connection)) {
                this.connections.delete(connection);
            }
        }
        for (const connection of mix.connections) {
            this.updateConnection(connection, false);
        }
        const toDeleteLockedInputs: ElaborationNodeDatum[] = [];
        for (const lockedInput of this.lockedInputs) {
            const connectionTo = mix.connections.find(a => a.drainType == ConnectionDrainType.NODE && a.drainNodeId == lockedInput.node.id);
            if (connectionTo == null) {
                toDeleteLockedInputs.push(lockedInput);
            } else if (connectionTo.sourceType == ConnectionSourceType.CONSTANT) {
                toDeleteLockedInputs.push(lockedInput);
            }
        }
        toDeleteLockedInputs.forEach(datum => this.lockedInputs.splice(this.lockedInputs.indexOf(datum), 1));

        const toDeleteExternalOutputs: Datum[] = [];
        for (const lockedExternalOutput of this.lockedExternalOutputs) {
            const connectionTo = mix.connections.find(a => a.drainType == ConnectionDrainType.OUTPUT && a.outputName == lockedExternalOutput.name);
            if (connectionTo == null) {
                toDeleteExternalOutputs.push(lockedExternalOutput);
            } else if (connectionTo.sourceType == ConnectionSourceType.CONSTANT) {
                toDeleteExternalOutputs.push(lockedExternalOutput);
            }
        }
        toDeleteExternalOutputs.forEach(datum => this.lockedExternalOutputs.splice(this.lockedExternalOutputs.indexOf(datum), 1));

    }

    public addNode(node: ElaborationNode): void {
        let maxX =
                [...this.nodePositions.values()]
                    .reduce<number | null>(
                        (acc, val) =>
                            acc == null ? val.x : Math.max(acc, val.x), null
                    );
        if (maxX == null) {
            maxX = 0;
        } else {
            maxX += MEASURES.NODE_WIDTH + MEASURES.NODE_SPACING;
        }
        const stacks = Math.max(node.inputs.length, node.outputs.length);
        const height = MEASURES.NODE_HEADING_HEIGHT + MEASURES.NODE_CONNECTION_HEIGHT * stacks + MEASURES.NODE_INTERNAL_SPACING * (stacks + 1);
        this.nodePositions.set(node, {x: maxX, y: -height / 2 + MEASURES.NODE_HEADING_HEIGHT / 2});
        this.maxNodeXPosition = Math.max(this.maxNodeXPosition, maxX + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2);
        this.mix
            ?.connections
            .filter(connection => connection.drainType == ConnectionDrainType.OUTPUT).forEach(connection => {this.updateConnection(connection, false);});
    }

    public addConnection(connection: Connection): void {
        this.updateConnection(connection, true);
    }

    private updateConnection(connection: Connection, isNew: boolean): void {
        if (this.mix == null) {
            return;
        }
        let from: Point = {x: 0, y: 0};
        let to: Point   = {x: 0, y: 0};
        if (connection.sourceType === ConnectionSourceType.NODE) {
            const node = this.mix.nodes.find(a => a.id === connection.sourceNodeId);
            if (node == null) {
                return;
            }
            const datum = node.outputs.find(a => a.name == connection.sourceNodeOutputName);
            if (datum == null) {
                return;
            }
            from = this.getNodeConnectorPosition(node, datum, true);
        } else if (connection.sourceType === ConnectionSourceType.INPUT) {
            const datum = this.mix.imports.find(a => a.uniqueName == connection.inputName);
            if (datum == null) {
                return;
            }
            from = this.getExternalConnectorPosition(datum, true);
        }
        if (connection.drainType === ConnectionDrainType.NODE) {
            const node = this.mix.nodes.find(a => a.id === connection.drainNodeId);
            if (node == null) {
                return;
            }
            const datum = node.inputs.find(a => a.name == connection.drainNodeInputName);
            if (datum == null) {
                return;
            }
            to = this.getNodeConnectorPosition(node, datum, false);
            if (isNew) {
                this.lockedInputs.push({
                                           datum,
                                           input: true,
                                           node
                                       });
            }
        }
        if (connection.drainType === ConnectionDrainType.OUTPUT) {
            const datum = this.mix.outputs.find(otherDatum => otherDatum.name == connection.outputName);
            if (datum == null) {
                return;
            }
            to = this.getExternalConnectorPosition(datum, false);
            if (isNew) {
                this.lockedExternalOutputs.push(datum);
            }
        }
        this.connections.set(connection, {from, to});
    }

    public removeConnection(connection: Connection): void {
        this.connections.delete(connection);
        if (connection.drainType == ConnectionDrainType.NODE) {
            const lockedInputIndex =
                      this
                          .lockedInputs
                          .findIndex(a =>
                                         (a.node.id == connection.drainNodeId) && (a.datum.name == connection.drainNodeInputName)
                          );
            if (lockedInputIndex != -1) {
                this.lockedInputs.splice(lockedInputIndex, 1);
            }
        }
        if (connection.drainType == ConnectionDrainType.OUTPUT) {
            const lockedInputIndex =
                      this
                          .lockedExternalOutputs
                          .findIndex(a =>
                                         (a.name == connection.outputName)
                          );
            if (lockedInputIndex != -1) {
                this.lockedExternalOutputs.splice(lockedInputIndex, 1);
            }
        }
    }

    public updateEdgeConnections(input: boolean): void {
        this
            .mix
            ?.connections
            .forEach(connection => {
                if ((input && connection.sourceType == ConnectionSourceType.INPUT)
                    || (!input && connection.drainType == ConnectionDrainType.OUTPUT && connection.sourceType != ConnectionSourceType.CONSTANT)) {
                    this.updateConnection(connection, false);
                }
            })
    }

    public isInputLocked(node: ElaborationNode, datum: Datum): boolean {
        return this.lockedInputs.some(a => a.node == node && a.datum == datum);
    }

    public isExternalOutputLocked(datum: Datum): boolean {
        return this.lockedExternalOutputs.includes(datum);
    }

    public getNodePosition(node: ElaborationNode): Point {
        return {...this.nodePositions.get(node) ?? {x: 0, y: 0}};
    }

    public getNodeConnectorPosition(node: ElaborationNode, connector: Datum, rightFacing: boolean): Point {
        // TODO: Think of caching the data to avoid calculation
        if (rightFacing) {
            const from = this.getNodePosition(node);

            from.x += MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2;

            from.y += this.getNodeConnectionTop(node, node.outputs.indexOf(connector));
            from.y += this.getNodeConnectionsDisplacement(node, false);

            return from;
        } else {
            const to = this.getNodePosition(node);

            to.x += MEASURES.SECTIONS_SEPARATOR / 2;

            to.y += this.getNodeConnectionTop(node, node.inputs.indexOf(connector));
            to.y += this.getNodeConnectionsDisplacement(node, true);

            return to;
        }
    }

    public getExternalConnectorPosition(connector: ExportedDatum | Datum, rightFacing: boolean): Point {
        if (rightFacing) {
            if (!(connector instanceof ExportedDatum)) {
                return {x: 0, y: 0};
            }
            const inputIndex = this.mix?.imports.indexOf(connector);
            if (inputIndex == null) {
                return {x: 0, y: 0};
            }
            return {
                x: -MEASURES.SECTIONS_SEPARATOR / 2,
                y: -this.inputsHeight / 2 + (MEASURES.INPUT_HEIGHT + MEASURES.INPUT_SPACING) * inputIndex + MEASURES.INPUT_HEIGHT / 2
            };
        } else {
            const inputIndex = this.mix?.outputs.indexOf(connector);
            if (inputIndex == null) {
                return {x: 0, y: 0};
            }
            return {
                x: this.outputsPosition,
                y: -this.outputsHeight / 2 + (MEASURES.OUTPUT_HEIGHT + MEASURES.OUTPUT_SPACING) * inputIndex + MEASURES.OUTPUT_HEIGHT / 2
            };
        }
    }

    public getConnectionPosition(connection: Connection): Line | null {
        const position = this.connections.get(connection);
        if (position == null) {
            return null;
        }
        return {...position};
    }

    public get draggingConnector(): Line | null {
        if (this.currentDragging == null) {
            return null;
        }
        if ((this.currentDragging.type == DraggingElementType.LINK_FROM_NODE_OUTPUT) || (this.currentDragging.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)) {
            return {from: this.currentDragging.connector.from, to: this.currentDragging.snapPosition ?? this.currentDragging.connector.to};
        } else if ((this.currentDragging.type == DraggingElementType.LINK_TO_NODE_INPUT) || (this.currentDragging.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT)) {
            return {from: this.currentDragging.snapPosition ?? this.currentDragging.connector.from, to: this.currentDragging.connector.to};
        }
        return null;
    }

    public get draggingConnectorDatumInfo(): DatumInfo | null {
        if (this.currentDragging == null) {
            return null;
        }
        if (
            (this.currentDragging.type == DraggingElementType.LINK_FROM_NODE_OUTPUT)
            || (this.currentDragging.type == DraggingElementType.LINK_TO_NODE_INPUT)
            || (this.currentDragging.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)
            || (this.currentDragging.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT)
        ) {
            return this.currentDragging.datumInfo;
        }
        return null;
    }

    public get replacingConnection(): Connection | null {
        if (
            (this.currentDragging?.type == DraggingElementType.LINK_TO_NODE_INPUT)
            || (this.currentDragging?.type == DraggingElementType.LINK_FROM_NODE_OUTPUT)
            || (this.currentDragging?.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)
            || (this.currentDragging?.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT)
        ) {
            return this.currentDragging.replacingConnection ?? null;
        }
        return null;
    }

    public getNodeConnectionsDisplacement(node: ElaborationNode, left: boolean): number {
        const leftHeight  = MEASURES.NODE_CONNECTION_HEIGHT * node.inputs.length + MEASURES.NODE_INTERNAL_SPACING * (node.inputs.length - 1);
        const rightHeight = MEASURES.NODE_CONNECTION_HEIGHT * node.outputs.length + MEASURES.NODE_INTERNAL_SPACING * (node.outputs.length - 1);
        if (left) {
            return Math.max(0, (rightHeight - leftHeight) / 2);
        } else {
            return Math.max(0, (leftHeight - rightHeight) / 2);
        }
    }

    public getNodeConnectionTop(node: ElaborationNode, index: number): number {
        return MEASURES.NODE_HEADING_HEIGHT / 2 + MEASURES.NODE_INTERNAL_SPACING * (index + 1) + MEASURES.NODE_CONNECTION_HEIGHT * (index + 0.5);
    }

    public get inputsHeight(): number {
        if (this.mix == null) {
            return 0;
        }
        let inputsOnly: number;
        if (this.mix.imports.length != 0) {
            inputsOnly = this.mix.imports.length * MEASURES.INPUT_HEIGHT + (this.mix.imports.length - 1) * MEASURES.INPUT_SPACING;
        } else {
            if (this.mix.imports.length == this.availableExportsLength) {
                return 0;
            } else {
                return MEASURES.ADD_INPUT_HEIGHT;
            }
        }
        if (this.mix.imports.length == this.availableExportsLength) {
            return inputsOnly;
        } else {
            return MEASURES.ADD_INPUT_HEIGHT + MEASURES.INPUT_SPACING + inputsOnly;
        }
    }


    public get outputsHeight(): number {
        if (this.mix == null) {
            return 0;
        }
        let outputsOnly: number;

        if (this.mix.outputs.length != 0) {
            outputsOnly = this.mix.outputs.length * MEASURES.INPUT_HEIGHT + (this.mix.outputs.length - 1) * MEASURES.INPUT_SPACING;
        } else {
            return MEASURES.ADD_INPUT_HEIGHT;
        }

        return MEASURES.ADD_INPUT_HEIGHT + MEASURES.INPUT_SPACING + outputsOnly;
    }

    public get outputsPosition(): number {
        return this.maxNodeXPosition + MEASURES.SECTIONS_SEPARATOR;
    }

    private currentDragging: DraggingElement | null = null;

    public get draggingConnectionForInput(): boolean {
        return (this.currentDragging?.type == DraggingElementType.LINK_FROM_NODE_OUTPUT) || (this.currentDragging?.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT);
    }

    public get draggingConnectionForOutput(): boolean {
        return (this.currentDragging?.type == DraggingElementType.LINK_TO_NODE_INPUT) || (this.currentDragging?.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT);
    }

    public get draggingConnectionInput(): Datum | null {
        const currentDragging = this.currentDragging;
        if ((currentDragging?.type == DraggingElementType.LINK_FROM_NODE_OUTPUT) || (currentDragging?.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)) {
            const replacingConnection = currentDragging.replacingConnection;
            if (replacingConnection?.drainType == ConnectionDrainType.NODE) {
                const drainNode = this.mix?.nodes.find(otherNode => otherNode.id == replacingConnection.drainNodeId);
                if (drainNode != null) {
                    return drainNode.inputs.find(input => input.name == replacingConnection.drainNodeInputName) ?? null;
                }
            }
        }
        return null;
    }

    public get draggingConnectionOutput(): Datum | null {
        const currentDragging = this.currentDragging;
        if ((currentDragging?.type == DraggingElementType.LINK_TO_NODE_INPUT) || (currentDragging?.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT)) {
            const replacingConnection = currentDragging.replacingConnection;
            if (replacingConnection?.sourceType == ConnectionSourceType.NODE) {
                const sourceNode = this.mix?.nodes.find(otherNode => otherNode.id == replacingConnection.sourceNodeId);
                if (sourceNode != null) {
                    return sourceNode.outputs.find(output => output.name == replacingConnection.sourceNodeOutputName) ?? null;
                }
            }
        }
        return null;
    }

    public get draggingConnectionExternalOutput(): Datum | null {
        const currentDragging = this.currentDragging;
        if ((currentDragging?.type == DraggingElementType.LINK_FROM_NODE_OUTPUT) || (currentDragging?.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)) {
            const replacingConnection = currentDragging.replacingConnection;
            if (replacingConnection?.drainType == ConnectionDrainType.OUTPUT) {
                const drainExternalOutput = this.mix?.outputs.find(output => output.name == replacingConnection.outputName);
                return drainExternalOutput ?? null;
            }
        }
        return null;
    }

    public get draggingConnectionExternalInput(): ExportedDatum | null {
        const currentDragging = this.currentDragging;
        if ((currentDragging?.type == DraggingElementType.LINK_TO_NODE_INPUT) || (currentDragging?.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT)) {
            const replacingConnection = currentDragging.replacingConnection;
            if (replacingConnection?.sourceType == ConnectionSourceType.INPUT) {
                const sourceExternalInput = this.mix?.imports.find(imp => imp.uniqueName == replacingConnection.inputName);
                return sourceExternalInput ?? null;
            }
        }
        return null;
    }

    private extractTransformedPosition(event: MouseEvent): Point {
        return {x: (event.clientX - this.translation.x) / this.scale, y: (event.clientY - this.translation.y) / this.scale};
    }

    public nodeMouseDown(node: ElaborationNode, event: MouseEvent): void {
        const pointerPosition = this.extractTransformedPosition(event);
        if (event.button != 0) {
            return;
        }
        const fallbackNodeX =
                  this
                      .mix
                      ?.nodes
                      .filter(a => a.id != node.id)
                      .reduce((acc, otherNode) =>
                                  Math.max(acc, this.getNodePosition(otherNode).x + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2), 0) ?? 0;
        this.currentDragging ??= {
            type:                 DraggingElementType.NODE,
            node:               node,
            startPosition:        {...this.getNodePosition(node)},
            startDrag:            pointerPosition,
            fallBackFurtherNodeX: fallbackNodeX
        };
    }

    public nodeConnectorMouseDown(node: ElaborationNode, datum: Datum, rightFacing: boolean, event: MouseEvent): void {
        this.connectorMouseDown({node, datum, external: false, rightFacing}, event, null);
    }

    public externalConnectorRightFacingMouseDown(datum: ExportedDatum, event: MouseEvent): void {
        this.connectorMouseDown({datum, external: true, rightFacing: true}, event, null);
    }

    public externalConnectorLeftFacingMouseDown(datum: Datum, event: MouseEvent): void {
        this.connectorMouseDown({datum, external: true, rightFacing: false}, event, null);
    }

    private connectorMouseDown(connector:
                                   { node: ElaborationNode, datum: Datum, external: false, rightFacing: boolean } |
                                   { datum: ExportedDatum, external: true, rightFacing: true } |
                                   { datum: Datum, external: true, rightFacing: false },
                               event: MouseEvent,
                               replacingConnection: Connection | null): void {
        const pointerPosition = this.extractTransformedPosition(event);
        if ((event.button != 0) || (this.mix == null) || (this.currentDragging != null)) {
            return;
        }
        if (connector.rightFacing) {
            // Dragging from a right-facing connector always creates a new connection, no matter if there is a new one already
            let from: Point;
            let newDragging: DraggingFromNodeOutput | DraggingFromExternalInput;
            if (!connector.external) {
                from        = this.getNodeConnectorPosition(connector.node, connector.datum, true);
                newDragging = {
                    type:             DraggingElementType.LINK_FROM_NODE_OUTPUT,
                    node:             connector.node,
                    outputName:       connector.datum.name,
                    connector:        {from, to: {...from}},
                    startDrag:        {...pointerPosition},
                    snapPosition:     null,
                    candidatePartner: null,
                    datumInfo:        {
                        type:     connector.datum.type,
                        nullable: connector.datum.nullable
                    }
                };
            } else {
                from        = this.getExternalConnectorPosition(connector.datum, true);
                newDragging = {
                    type:             DraggingElementType.LINK_FROM_EXTERNAL_INPUT,
                    inputName:        connector.datum.uniqueName,
                    connector:        {from, to: {...from}},
                    startDrag:        {...pointerPosition},
                    snapPosition:     null,
                    candidatePartner: null,
                    datumInfo:        {
                        type:     connector.datum.type,
                        nullable: connector.datum.nullable
                    }
                };
            }

            if (replacingConnection != null) {
                let to: Point | null = null;
                if (replacingConnection.drainType == ConnectionDrainType.NODE) {
                    const drainNode  = this.mix.nodes.find(otherNode => otherNode.id == replacingConnection.drainNodeId);
                    const drainDatum = drainNode?.inputs.find(output => output.name == replacingConnection.drainNodeInputName);
                    if (drainNode != null && drainDatum != null) {
                        // No connection, we are creating a new one
                        to = this.getNodeConnectorPosition(drainNode, drainDatum, false);

                        newDragging.candidatePartner = {external: false, node: drainNode, datum: drainDatum, input: true};
                    }
                } else {
                    const output = this.mix.outputs.find(otherOutput => otherOutput.name == replacingConnection.outputName);
                    if (output != null) {
                        to                           = this.getExternalConnectorPosition(output, false);
                        newDragging.candidatePartner = {external: true, datum: output, input: false};
                    }
                }
                if (to != null) {
                    newDragging.connector.to = {...to};

                    newDragging.startDrag.x -= to.x - newDragging.connector.from.x;
                    newDragging.startDrag.y -= to.y - newDragging.connector.from.y;

                    newDragging.replacingConnection = replacingConnection;

                    newDragging.snapPosition = {...newDragging.connector.to};
                }
            }

            this.currentDragging = newDragging;
        } else {
            // Left-facing connector

            // Find if the connection already exists
            let existingInConnection: Connection | undefined;
            if (!connector.external) {
                existingInConnection =
                    this.mix.connections.find(a => a.drainType == ConnectionDrainType.NODE && a.drainNodeId == connector.node.id && a.drainNodeInputName == connector.datum.name);
            } else {
                existingInConnection =
                    this.mix.connections.find(a => a.drainType == ConnectionDrainType.OUTPUT && a.outputName == connector.datum.name);
            }
            if (existingInConnection != null && existingInConnection != replacingConnection) {
                if (existingInConnection.sourceType == ConnectionSourceType.NODE) {
                    const sourceNode  = this.mix.nodes.find(otherNode => otherNode.id == existingInConnection.sourceNodeId);
                    const sourceDatum = sourceNode?.outputs.find(output => output.name == existingInConnection.sourceNodeOutputName);
                    if (sourceNode != null && sourceDatum != null) {
                        this.connectorMouseDown({node: sourceNode, datum: sourceDatum, external: false, rightFacing: true}, event, existingInConnection);
                    }
                } else if (existingInConnection.sourceType == ConnectionSourceType.CONSTANT) {
                    if (!connector.external) {
                        this.connectorMouseDown({node: connector.node, datum: connector.datum, external: false, rightFacing: false}, event, existingInConnection);
                    } else {
                        this.connectorMouseDown({external: true, rightFacing: false, datum: connector.datum}, event, existingInConnection);
                    }
                } else { // ConnectionSourceType.INPUT
                    const exportedDatum = this.mix.imports.find(otherExport => otherExport.uniqueName == existingInConnection.inputName);
                    if (exportedDatum != null) {
                        this.connectorMouseDown({datum: exportedDatum, external: true, rightFacing: true}, event, existingInConnection);
                    }
                }
                return;
            } else {
                // No connection, we are creating a new one

                let newDragging: DraggingToNodeInput | DraggingToExternalOutput;
                if (!connector.external) {
                    const to = this.getNodeConnectorPosition(connector.node, connector.datum, false);

                    newDragging = {
                        type:             DraggingElementType.LINK_TO_NODE_INPUT,
                        node:             connector.node,
                        inputName:        connector.datum.name,
                        connector:        {from: {...to}, to},
                        startDrag:        {...pointerPosition},
                        snapPosition:     null,
                        candidatePartner: null,
                        datumInfo:        {
                            type:     connector.datum.type,
                            nullable: connector.datum.nullable
                        }
                    };
                } else {
                    const to = this.getExternalConnectorPosition(connector.datum, false);

                    newDragging = {
                        type:             DraggingElementType.LINK_TO_EXTERNAL_OUTPUT,
                        outputName:       connector.datum.name,
                        connector:        {from: {...to}, to},
                        startDrag:        {...pointerPosition},
                        snapPosition:     null,
                        candidatePartner: null,
                        datumInfo:        {
                            type:     connector.datum.type,
                            nullable: connector.datum.nullable
                        }
                    };
                }

                if (replacingConnection?.sourceType == ConnectionSourceType.NODE) {
                    const sourceNode  = this.mix.nodes.find(otherNode => otherNode.id == replacingConnection.sourceNodeId);
                    const sourceDatum = sourceNode?.outputs.find(output => output.name == replacingConnection.sourceNodeOutputName);
                    if (sourceNode != null && sourceDatum != null) {
                        // No connection, we are creating a new one
                        const from = this.getNodeConnectorPosition(sourceNode, sourceDatum, true);

                        newDragging.connector.from = {...from};

                        newDragging.startDrag.x -= from.x - newDragging.connector.to.x;
                        newDragging.startDrag.y -= from.y - newDragging.connector.to.y;

                        newDragging.replacingConnection = replacingConnection;
                        newDragging.candidatePartner    = {external: false, node: sourceNode, datum: sourceDatum, input: false};
                        newDragging.snapPosition        = {...newDragging.connector.from};
                    }
                }

                if (replacingConnection != null) {
                    newDragging.replacingConnection = replacingConnection;
                }

                this.currentDragging = newDragging;
            }
        }
    }

    public nodeConnectorMouseMove(node: ElaborationNode, connector: Datum, rightFacing: boolean): void {
        if (this.mix != null) {
            if (
                (
                    (this.currentDragging?.type == DraggingElementType.LINK_TO_NODE_INPUT)
                    ||
                    (this.currentDragging?.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT)
                )
                &&
                rightFacing
                &&
                this.currentDragging.snapPosition == null
            ) {
                this.currentDragging.snapPosition     = this.getNodeConnectorPosition(node, connector, true);
                this.currentDragging.candidatePartner = {external: false, node, datum: connector, input: false};
            } else if (
                (
                    (this.currentDragging?.type == DraggingElementType.LINK_FROM_NODE_OUTPUT)
                    ||
                    (this.currentDragging?.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)
                )
                &&
                !rightFacing
                &&
                this.currentDragging.snapPosition == null
            ) {
                this.currentDragging.snapPosition     = this.getNodeConnectorPosition(node, connector, false);
                this.currentDragging.candidatePartner = {external: false, node, datum: connector, input: true};
            }
        }
    }

    public externalConnectorRightFacingMouseMove(connector: ExportedDatum): void {
        if (this.mix != null) {
            if (
                (
                    (this.currentDragging?.type == DraggingElementType.LINK_TO_NODE_INPUT)
                    || (this.currentDragging?.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT)
                )
                &&
                this.currentDragging.snapPosition == null
            ) {
                this.currentDragging.snapPosition     = this.getExternalConnectorPosition(connector, true);
                this.currentDragging.candidatePartner = {external: true, datum: connector, input: true};
            }
        }
    }

    public externalConnectorLeftFacingMouseMove(connector: Datum): void {
        if (this.mix != null) {
            if (
                (
                    (this.currentDragging?.type == DraggingElementType.LINK_FROM_NODE_OUTPUT)
                    || (this.currentDragging?.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)
                )
                && this.currentDragging.snapPosition == null
            ) {
                this.currentDragging.snapPosition     = this.getExternalConnectorPosition(connector, false);
                this.currentDragging.candidatePartner = {external: true, datum: connector, input: false};
            }
        }
    }

    public backgroundMouseDown(event: MouseEvent): void {
        if (this.currentDragging != null) {
            return;
        }
        this.currentDragging = {
            type:           DraggingElementType.BACKGROUND,
            startTransform: {...this.translation},
            startDrag:      {x: event.clientX, y: event.clientY}
        };
    }

    public get backgroundCursor(): string {
        if (this.currentDragging == null || this.currentDragging.type == DraggingElementType.BACKGROUND) {
            return 'move';
        } else {
            return 'default';
        }
    }

    public get draggingBackground(): boolean {
        return this.currentDragging == null || this.currentDragging.type == DraggingElementType.BACKGROUND;
    }

    public mouseMove(event: MouseEvent): void {
        const pointerPosition = this.extractTransformedPosition(event);
        if (this.currentDragging == null) {
            return;
        }
        if (this.currentDragging.type == DraggingElementType.NODE) {
            const node = this.currentDragging.node;
            const newX   = Math.max(0, this.currentDragging.startPosition.x + pointerPosition.x - this.currentDragging.startDrag.x);
            this.nodePositions.set(node, {
                x: newX,
                y: this.currentDragging.startPosition.y + pointerPosition.y - this.currentDragging.startDrag.y
            });
            this.maxNodeXPosition = Math.max(this.currentDragging.fallBackFurtherNodeX, newX + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2);
            this
                .mix
                ?.connections
                .filter(a =>
                            (a.sourceType == ConnectionSourceType.NODE && a.sourceNodeId == node.id)
                            || (a.drainType == ConnectionDrainType.NODE && a.drainNodeId == node.id)
                            || (a.drainType == ConnectionDrainType.OUTPUT))
                .forEach(connection => { this.updateConnection(connection, false); });

        } else if (this.currentDragging.type == DraggingElementType.BACKGROUND) {
            this.translation.x = this.currentDragging.startTransform.x + event.clientX - this.currentDragging.startDrag.x;
            this.translation.y = this.currentDragging.startTransform.y + event.clientY - this.currentDragging.startDrag.y;
        } else if ((this.currentDragging.type == DraggingElementType.LINK_FROM_NODE_OUTPUT) || (this.currentDragging.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)) {
            this.currentDragging.connector.to.x = this.currentDragging.connector.from.x + pointerPosition.x - this.currentDragging.startDrag.x;
            this.currentDragging.connector.to.y = this.currentDragging.connector.from.y + pointerPosition.y - this.currentDragging.startDrag.y;

            if (this.currentDragging.snapPosition) {
                const dx       = this.currentDragging.connector.to.x - this.currentDragging.snapPosition.x;
                const dy       = this.currentDragging.connector.to.y - this.currentDragging.snapPosition.y;
                const distance = dx * dx + dy * dy;
                if (distance > MEASURES.CONNECTOR_SNAP_RADIUS_SQUARED) {
                    this.currentDragging.snapPosition     = null;
                    this.currentDragging.candidatePartner = null;
                }
            }
        } else { // LINK_TO_NODE_INPUT or LINK_TO_EXTERNAL_OUTPUT
            this.currentDragging.connector.from.x = this.currentDragging.connector.to.x + pointerPosition.x - this.currentDragging.startDrag.x;
            this.currentDragging.connector.from.y = this.currentDragging.connector.to.y + pointerPosition.y - this.currentDragging.startDrag.y;

            if (this.currentDragging.snapPosition) {
                const dx       = this.currentDragging.connector.from.x - this.currentDragging.snapPosition.x;
                const dy       = this.currentDragging.connector.from.y - this.currentDragging.snapPosition.y;
                const distance = dx * dx + dy * dy;
                if (distance > MEASURES.CONNECTOR_SNAP_RADIUS_SQUARED) {
                    this.currentDragging.snapPosition     = null;
                    this.currentDragging.candidatePartner = null;
                }
            }
        }
    }

    public mouseUp(): void {
        if ((this.currentDragging == null) || (this.mix == null)) {
            return;
        }
        if ((this.currentDragging.type == DraggingElementType.LINK_FROM_NODE_OUTPUT) || (this.currentDragging.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)) {
            let deleteOld = false;
            let createNew = false;
            if (this.currentDragging.replacingConnection != null && this.currentDragging.candidatePartner == null) {
                // The temporary connection was a connection detached from an input, but no new input was chosen. The connection must be severed.
                deleteOld = true;
            } else if (this.currentDragging.replacingConnection == null && this.currentDragging.candidatePartner != null) {
                // The temporary connection was a new connection, and a new node was chosen. The connection is a new connection to be created.
                createNew = true;
            } else if (this.currentDragging.replacingConnection != null && this.currentDragging.candidatePartner != null) {
                // The temporary connection was a connection detached from an input, and a new input was chosen. The old connection must be severed and the new one created
                deleteOld = true;
                createNew = true;
            }
            let newConnection: Connection | null = null;
            if (createNew) {
                if (this.currentDragging.candidatePartner != null) {
                    if (this.currentDragging.type == DraggingElementType.LINK_FROM_NODE_OUTPUT) {
                        if (!this.currentDragging.candidatePartner.external) {
                            if (this.currentDragging.node == this.currentDragging.candidatePartner.node) {
                                deleteOld = false;
                                createNew = false;
                            } else {
                                newConnection = {
                                    sourceType:           ConnectionSourceType.NODE,
                                    sourceNodeId:         this.currentDragging.node.id,
                                    sourceNodeOutputName: this.currentDragging.outputName,
                                    drainType:            ConnectionDrainType.NODE,
                                    drainNodeId:          this.currentDragging.candidatePartner.node.id,
                                    drainNodeInputName:   this.currentDragging.candidatePartner.datum.name
                                };
                                if (this.mix.wouldAddCycle(newConnection)) {
                                    deleteOld = false;
                                    createNew = false;
                                }
                            }
                        } else {
                            newConnection = {
                                sourceType:           ConnectionSourceType.NODE,
                                sourceNodeId:         this.currentDragging.node.id,
                                sourceNodeOutputName: this.currentDragging.outputName,
                                drainType:            ConnectionDrainType.OUTPUT,
                                outputName:           this.currentDragging.candidatePartner.datum.name
                            };
                        }
                    } else {
                        if (!this.currentDragging.candidatePartner.external) {
                            newConnection = {
                                sourceType:         ConnectionSourceType.INPUT,
                                inputName:          this.currentDragging.inputName,
                                drainType:          ConnectionDrainType.NODE,
                                drainNodeId:        this.currentDragging.candidatePartner.node.id,
                                drainNodeInputName: this.currentDragging.candidatePartner.datum.name
                            };
                        } else {
                            newConnection = {
                                sourceType: ConnectionSourceType.INPUT,
                                inputName:  this.currentDragging.inputName,
                                drainType:  ConnectionDrainType.OUTPUT,
                                outputName: this.currentDragging.candidatePartner.datum.name
                            };
                        }
                    }
                }
            }
            if (deleteOld) {
                if (this.currentDragging.replacingConnection != null) {
                    this.mix.removeConnection(this.currentDragging.replacingConnection);
                    this.removeConnection(this.currentDragging.replacingConnection);
                }
            }
            if (createNew) {
                if (this.currentDragging.candidatePartner != null && newConnection != null) {
                    this.mix.addConnection(newConnection);
                    this.addConnection(newConnection);
                }
            }
        }
        if ((this.currentDragging.type == DraggingElementType.LINK_TO_NODE_INPUT) || (this.currentDragging.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT)) {
            // Dragging to the left <--
            if (this.currentDragging.candidatePartner != null) {
                let newConnection: Connection | null = null;
                if (!this.currentDragging.candidatePartner.external) {
                    // Dragging to a node output
                    if (this.currentDragging.type == DraggingElementType.LINK_TO_NODE_INPUT) {
                        // Dragging from a node input
                        if (this.currentDragging.node != this.currentDragging.candidatePartner.node) {
                            newConnection = {
                                sourceType:           ConnectionSourceType.NODE,
                                sourceNodeId:         this.currentDragging.candidatePartner.node.id,
                                sourceNodeOutputName: this.currentDragging.candidatePartner.datum.name,
                                drainType:            ConnectionDrainType.NODE,
                                drainNodeId:          this.currentDragging.node.id,
                                drainNodeInputName:   this.currentDragging.inputName
                            };
                        }
                    } else {
                        // Dragging from an external output
                        newConnection = {
                            sourceType:           ConnectionSourceType.NODE,
                            sourceNodeId:         this.currentDragging.candidatePartner.node.id,
                            sourceNodeOutputName: this.currentDragging.candidatePartner.datum.name,
                            drainType:            ConnectionDrainType.OUTPUT,
                            outputName:           this.currentDragging.outputName
                        };
                    }
                } else {
                    // Dragging to an external input
                    if (this.currentDragging.type == DraggingElementType.LINK_TO_NODE_INPUT) {
                        // Dragging from a node input
                        newConnection = {
                            sourceType:         ConnectionSourceType.INPUT,
                            inputName:          this.currentDragging.candidatePartner.datum.uniqueName,
                            drainType:          ConnectionDrainType.NODE,
                            drainNodeId:        this.currentDragging.node.id,
                            drainNodeInputName: this.currentDragging.inputName
                        };
                    } else {
                        // Dragging from an external output
                        newConnection = {
                            sourceType: ConnectionSourceType.INPUT,
                            inputName:  this.currentDragging.candidatePartner.datum.uniqueName,
                            drainType:  ConnectionDrainType.OUTPUT,
                            outputName: this.currentDragging.outputName
                        };
                    }
                }

                if (newConnection) {
                    this.mix.addConnection(newConnection);
                    this.addConnection(newConnection);
                    if (this.currentDragging.replacingConnection?.sourceType == ConnectionSourceType.CONSTANT) {
                        this.removeConnection(this.currentDragging.replacingConnection);
                    }
                }
            }
        }
        this.currentDragging = null;
    }

    public wheel(wheelEvent: WheelEvent): void {
        let change     = Math.pow(10, wheelEvent.deltaY / 700);
        const newScale = Math.max(0.1, Math.min(5, this.scale * change));
        if (newScale == this.scale) {
            return;
        }
        change                         = newScale / this.scale;
        let element: SVGElement | null = null;
        if (this.svgElement instanceof SVGElement) {
            element = this.svgElement;
        }
        const clientX = wheelEvent.clientX - (element?.getBoundingClientRect().left ?? 0);
        const clientY = wheelEvent.clientY - (element?.getBoundingClientRect().top ?? 0);
        this.translation.x += (clientX - this.translation.x) * (1 - change);
        this.translation.y += (clientY - this.translation.y) * (1 - change);
        this.scale    = newScale;
    }

}

enum DraggingElementType {
    NODE,
    BACKGROUND,
    LINK_FROM_NODE_OUTPUT,
    LINK_FROM_EXTERNAL_INPUT,
    LINK_TO_NODE_INPUT,
    LINK_TO_EXTERNAL_OUTPUT
}


interface CandidateNodeOutput {
    external: false;
    node: ElaborationNode,
    datum: Datum,
    input: false;
}

interface CandidateNodeInput {
    external: false;
    node: ElaborationNode,
    datum: Datum,
    input: true;
}

interface CandidateExternalInput {
    external: true;
    datum: ExportedDatum;
    input: true;
}

interface CandidateExternalOutput {
    external: true;
    datum: Datum;
    input: false;
}

interface DraggingNode {
    type: DraggingElementType.NODE,
    node: ElaborationNode,
    startPosition: Point,
    startDrag: Point,
    fallBackFurtherNodeX: number,
}

interface DraggingBackground {
    type: DraggingElementType.BACKGROUND,
    startTransform: Point,
    startDrag: Point
}

interface DraggingFromNodeOutput {
    type: DraggingElementType.LINK_FROM_NODE_OUTPUT;
    node: ElaborationNode;
    outputName: string;
    connector: Line;
    startDrag: Point;
    snapPosition: Point | null;
    replacingConnection?: Connection;
    candidatePartner: CandidateNodeInput | CandidateExternalOutput | null;
    datumInfo: DatumInfo;
}

interface DraggingFromExternalInput {
    type: DraggingElementType.LINK_FROM_EXTERNAL_INPUT;
    inputName: string,
    connector: Line;
    startDrag: Point;
    snapPosition: Point | null;
    replacingConnection?: Connection;
    candidatePartner: CandidateNodeInput | CandidateExternalOutput | null;
    datumInfo: DatumInfo;
}

interface DraggingToNodeInput {
    type: DraggingElementType.LINK_TO_NODE_INPUT;
    node: ElaborationNode;
    inputName: string;
    connector: Line;
    startDrag: Point;
    snapPosition: Point | null;
    replacingConnection?: Connection;
    candidatePartner: CandidateNodeOutput | CandidateExternalInput | null;
    datumInfo: DatumInfo;
}

interface DraggingToExternalOutput {
    type: DraggingElementType.LINK_TO_EXTERNAL_OUTPUT;
    outputName: string;
    connector: Line;
    startDrag: Point;
    snapPosition: Point | null;
    replacingConnection?: Connection;
    candidatePartner: CandidateNodeOutput | CandidateExternalInput | null;
    datumInfo: DatumInfo;
}

type DraggingElement = DraggingNode | DraggingBackground | DraggingFromNodeOutput | DraggingToNodeInput | DraggingFromExternalInput | DraggingToExternalOutput;

export const MEASURES = {
    INPUT_WIDTH:                      200,
    INPUT_HEIGHT:                     90,
    ADD_INPUT_HEIGHT:                 50,
    INPUT_SPACING:                    10,
    INPUT_ORIGIN_TOP:                 20,
    INPUT_ORIGIN_NAME_TOP:            39,
    INPUT_NAME_TOP:                   66,
    CONNECTOR_RADIUS:                 8,
    SECTIONS_SEPARATOR:               180,
    NODE_ADD_RADIUS:                  35,
    NODE_WIDTH:                       350,
    NODE_SPACING:                     160,
    NODE_HEADING_HEIGHT:              40,
    NODE_HEADING_WIDTH:               250,
    NODE_INTERNAL_SPACING:            15,
    NODE_CONNECTION_HEIGHT:           40,
    NODE_CONNECTION_CONSTANT_SHIFT:   12,
    NODE_CONNECTION_CONSTANT_SPACING: 25,
    CONNECTION_WIDTH:                 3,
    CONNECTOR_SNAP_RADIUS:            30,
    CONNECTOR_SNAP_RADIUS_SQUARED:    30 * 30,
    OUTPUT_WIDTH:                     250,
    OUTPUT_HEIGHT:                    70,
    ADD_OUTPUT_HEIGHT:                50,
    OUTPUT_SPACING:                   10
};
