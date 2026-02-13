import {Point} from '@angular/cdk/drag-drop';
import {ArbitraryInputsElaborationNode, ElaborationNode} from '@common/mixing/mix/elaboration-node';
import {Connection, ConnectionDrainToNode, ConnectionDrainType, ConnectionSourceFromNode, ConnectionSourceType, Mix} from '@common/mixing/mix/mix';
import {Datum, DatumInfo, ElaborationNodeDatum, ExportedDatum} from '@common/mixing/mix/datum';
import { Line, MEASURES } from "../constants";
import {ResizeEvent} from '../../../directives/resize-event/resize-event.directive';
import {NodeInputInfo} from './mix.component';
import {MixLayout} from '@common/mixing/mix/mix-layout';
import {mapToRecord, recordFromEntries} from '@common/utils/generics';

export class MixUiManager {

    public translation: Point = {x: MEASURES.SECTIONS_SEPARATOR + MEASURES.INPUT_WIDTH, y: 0};
    public scale: number      = 1;

    private nodePositions: Map<ElaborationNode, Point> = new Map<ElaborationNode, Point>();
    private maxNodeXPosition: number                   = 0;

    private connections: Map<Connection, Line> = new Map<Connection, Line>();

    private lockedInputs: ElaborationNodeDatum[] = [];
    private lockedExternalOutputs: Datum[]       = [];

    private _mix: Mix | null = null;

    public availableExportsLength: number | null = null;

    public svgElement: HTMLElement | null = null;

    public showOutputAdd: boolean = true;

    private _viewSize: Point = { x: 0, y: 0};

    private changeCallbacks: (() => void)[] = [];

    public set mix(mix: Mix) {
        this._mix = mix;
        this.refreshMix();
    }

    public set viewSize(resizeEvent: ResizeEvent) {
        this._viewSize = {x: resizeEvent.width, y: resizeEvent.height};
    }

    public refreshMix(): void {
        // Sometimes changes made to the mix are not catchable. This function refreshes these changes
        const mix = this._mix;
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
            this.updateConnection(connection);
        }
        const toDeleteLockedInputs: ElaborationNodeDatum[] = [];
        for (const lockedInput of this.lockedInputs) {
            const connectionTo = mix.connections.find(a => a.drainType == ConnectionDrainType.NODE && a.drainNodeId == lockedInput.node.id && a.drainNodeInputName == lockedInput.datum.name);
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

    public rearrangeNodes(): void {
        const mix = this._mix;
        if (mix == null) {
            return;
        }

        interface TreeNode {
            node: ElaborationNode;
            children: TreeNode[];
            parents: TreeNode[];
            level?: number;
        }

        const tree: TreeNode[]              = [];
        const sourceTreeNodes: TreeNode[] = [];
        const connections                   = mix.connections.slice();
        let missingNodes: ElaborationNode[] = mix.nodes.slice();
        let maxHeight: number | null = null;
        for (const node of mix.nodes) {
            // We gather all nodes that don't have other nodes before them (meaning they come either from inputs, or have all constant or null inputs
            if (!mix.connections.some(connection => connection.drainType == ConnectionDrainType.NODE && connection.drainNodeId == node.id)) {
                const nodeIndex = missingNodes.indexOf(node);
                if (nodeIndex != -1) {
                    missingNodes.splice(nodeIndex, 1);
                    const newNode = {
                        node,
                        children: [],
                        parents:  []
                    };
                    tree.push(newNode);
                    sourceTreeNodes.push(newNode);
                }
            }
        }

        // We know we have to at least check all the tree children (if we have found some)
        let level      = tree;
        let cycleFound = false;
        while (level.length != 0) {
            // At every depth level, we see if we can find undiscovered nodes. If there are drain nodes that are not undiscovered, it means we have a cycle.
            // Otherwise, we go until we are left with nodes outside the reach of the inputs.
            const newLevel: TreeNode[] = [];
            for (const node of level) {
                const drainConnections: (ConnectionSourceFromNode & ConnectionDrainToNode)[] = connections.filter(
                    (connection): connection is ConnectionSourceFromNode & ConnectionDrainToNode => (
                        connection.sourceType == ConnectionSourceType.NODE
                        && connection.sourceNodeId == node.node.id
                        && connection.drainType == ConnectionDrainType.NODE
                    )
                );
                for (const connection of drainConnections) {
                    if (connection.drainNodeId == node.node.id) {
                        // A self-loop is found. Abort
                        cycleFound = true;
                        break;
                    }
                    const nodeIndex = missingNodes.findIndex(
                        a => a.id == connection.drainNodeId
                    );
                    if (nodeIndex != -1) {
                        const drainNode = missingNodes[nodeIndex];
                        missingNodes.splice(nodeIndex, 1);
                        if (drainNode != null) {
                            const newNode = {
                                node:     drainNode,
                                children: [],
                                parents:  [node]
                            };
                            node.children.push(newNode);
                            sourceTreeNodes.push(newNode);
                            newLevel.push(newNode);
                        }
                    } else {
                        // The node has already been discovered. It may be a cycle, but it may also be caught by another branch.
                        // To check if it's a cycle, we search back to the parents until we get to the root or we find the cycle
                        const treeNode = sourceTreeNodes.find(otherTreeNode => otherTreeNode.node.id == connection.drainNodeId);
                        if (treeNode != null) {
                            let toCheck = node.parents;
                            let found   = false;
                            while ((toCheck.length != 0) && !found) {
                                found   = toCheck.includes(treeNode);
                                toCheck = toCheck.flatMap(a => a.parents);
                            }
                            if (found) {
                                // A we have found the node in the ancestors. It's a cycle
                                cycleFound = true;
                                break;
                            } else {
                                // The node was only reached by someone else, we add this node to its parents
                                // We do not add the child to next level because it's already been elaborated
                                treeNode.parents.push(node);
                                node.children.push(treeNode);
                            }
                        } else {
                            throw new Error('Cannot redo the layout');
                        }
                    }
                }
                if (cycleFound) {
                    break;
                }
            }
            if (cycleFound) {
                break;
            }
            // All the new levels have been elaborated, next level are the discovered children
            level = newLevel;
        }

        if (!cycleFound) {
            const placedParents: Set<TreeNode> = new Set<TreeNode>();
            let toPlace: Set<TreeNode>         = new Set<TreeNode>(tree);
            let levelNumber                    = 0;
            while (toPlace.size != 0) {
                const nextToPlace = new Set<TreeNode>();
                for (const node of toPlace) {
                    if (node.parents.every(a => placedParents.has(a))) {
                        // The parents are all placed. This is as good of a level as any to stop
                        node.level = levelNumber;
                        placedParents.add(node);
                        node.children.forEach((child) => nextToPlace.add(child));
                    } else {
                        // Some parents have yet to be placed, we postpone the placement to later
                        nextToPlace.add(node);
                    }
                }
                toPlace = nextToPlace;
                levelNumber++;
            }
            // All nodes have been placed. We now sort the parents by level to have an ordered tree
            const ordered    = [...placedParents.values()].sort(
                (a, b) => {
                    if (a.level == null || b.level == null) {
                        return 0;
                    }
                    return a.level - b.level;
                }
            );
            let y            = 0;
            let lastLevel    = 0;
            const levelHeights = new Map<number, number>();
            for (const treeNode of ordered) {
                if (treeNode.level != lastLevel) {
                    levelHeights.set(lastLevel, y - MEASURES.NODE_HEADING_HEIGHT);
                    if (maxHeight == null) {
                        maxHeight = y - MEASURES.NODE_HEADING_HEIGHT;
                    } else {
                        maxHeight = Math.max(maxHeight, y - MEASURES.NODE_HEADING_HEIGHT);
                    }
                    lastLevel = treeNode.level ?? 0;
                    y         = 0;
                }
                this.nodePositions.set(
                    treeNode.node,
                    {
                        x: (treeNode.level ?? 0) * (MEASURES.NODE_WIDTH + MEASURES.NODE_SPACING),
                        y
                    }
                );
                const stacks = Math.max(treeNode.node.inputs.length, treeNode.node.outputs.length);
                y += MEASURES.NODE_HEADING_HEIGHT + MEASURES.NODE_CONNECTION_HEIGHT * stacks + MEASURES.NODE_INTERNAL_SPACING * (stacks + 1) + MEASURES.NODE_HEADING_HEIGHT;
            }
            levelHeights.set(lastLevel, y - MEASURES.NODE_HEADING_HEIGHT);
            if (maxHeight == null) {
                maxHeight = y - MEASURES.NODE_HEADING_HEIGHT;
            } else {
                maxHeight = Math.max(maxHeight, y - MEASURES.NODE_HEADING_HEIGHT);
            }
            for (const treeNode of ordered) {
                if (treeNode.level != null) {
                    this.shiftNode({x: 0, y: - (levelHeights.get(treeNode.level) ?? 0) / 2}, treeNode.node)
                }
            }
        } else {
            // There is a cycle. All the nodes must be rearranged loosely, as if they weren't oriented.
            missingNodes        = mix.nodes.slice();
        }

        // Ordering the missing nodes

        const linkedTreeNodes: TreeNode[] = missingNodes.map(node => {
            return {
                node,
                children: [],
                parents:  []
            };
        });
        for (const treeNode of linkedTreeNodes) {
            const drainConnections: (ConnectionSourceFromNode & ConnectionDrainToNode)[] = connections.filter(
                (connection): connection is ConnectionSourceFromNode & ConnectionDrainToNode => (
                    connection.sourceType == ConnectionSourceType.NODE
                    && connection.sourceNodeId == treeNode.node.id
                    && connection.drainType == ConnectionDrainType.NODE
                )
            );
            for (const connection of drainConnections) {
                const otherNode = linkedTreeNodes.find(candidate => candidate.node.id == connection.drainNodeId);
                if (otherNode != null) {
                    if (!treeNode.children.includes(otherNode)) {
                        treeNode.children.push(otherNode);
                    }
                    if (!otherNode.parents.includes(treeNode)) {
                        otherNode.parents.push(treeNode);
                    }
                }
            }
        }
        const fromInputNodesId =
                  mix.connections
                     .filter(
                         (connection) =>
                             connection.sourceType == ConnectionSourceType.INPUT && connection.drainType == ConnectionDrainType.NODE
                     )
                     .map(connection => connection.drainNodeId);
        linkedTreeNodes.sort((a, b) => {
            if (fromInputNodesId.includes(a.node.id)) {
                return fromInputNodesId.includes(b.node.id) ? 0 : 1;
            } else {
                return b.parents.length - a.parents.length;
            }
        })

        const clusters: { seed: TreeNode, cluster: TreeNode[]}[] = [];
        while (linkedTreeNodes.length != 0) {
            const nextSeed = linkedTreeNodes.pop();
            if (nextSeed == null) {
                break;
            }
            const cluster: TreeNode[] = [];
            clusters.push({seed: nextSeed, cluster});
            cluster.push(nextSeed);
            let candidates = nextSeed.children.slice();
            while (candidates.length != 0) {
                const newCandidates = [];
                for (const candidate of candidates) {
                    if (!cluster.includes(candidate) && linkedTreeNodes.includes(candidate)) {
                        cluster.push(candidate);
                        newCandidates.push(...candidate.children);
                        linkedTreeNodes.splice(linkedTreeNodes.indexOf(candidate), 1);
                    }
                }
                candidates = newCandidates;
            }
        }

        let centerY;
        let topShift: number | null = null;
        let bottomShift: number | null = null;
        let shift: "CENTER" | "TOP" | "BOTTOM";
        if ((maxHeight == null) || (tree.length == 0)) {
            centerY = 0;
            shift   = "CENTER";
        } else {
            centerY = - maxHeight / 2 - MEASURES.NODE_SPACING;
            shift   = "TOP";
        }
        for (const cluster of clusters) {
            let nextMaxHeight = 0;
            let x = 0;
            for (const node of cluster.cluster) {
                const stacks = Math.max(node.node.inputs.length, node.node.outputs.length);
                const height = MEASURES.NODE_HEADING_HEIGHT + MEASURES.NODE_CONNECTION_HEIGHT * stacks + MEASURES.NODE_INTERNAL_SPACING * (stacks + 1);
                nextMaxHeight = Math.max(nextMaxHeight, height);
                this.nodePositions.set(node.node, {
                    x,
                    y: centerY - height / 2
                })
                x += MEASURES.NODE_WIDTH + MEASURES.NODE_SPACING;
            }
            switch (shift) {
                case "TOP":
                    cluster.cluster.forEach(node => {this.shiftNode({x: 0, y: -nextMaxHeight / 2}, node.node)});
                    topShift = centerY - nextMaxHeight - MEASURES.NODE_SPACING;
                    shift = "BOTTOM";
                    if (bottomShift == null) {
                        centerY = (maxHeight ?? 0)/2;
                    } else {
                        centerY = bottomShift;
                    }
                    maxHeight = nextMaxHeight;
                    break;
                case "CENTER":
                    centerY = - nextMaxHeight / 2 - MEASURES.NODE_SPACING;
                    shift   = "TOP";
                    maxHeight = nextMaxHeight;
                    break;
                case "BOTTOM":
                    cluster.cluster.forEach(node => {this.shiftNode({x: 0, y: nextMaxHeight / 2}, node.node)});
                    bottomShift = centerY + nextMaxHeight + MEASURES.NODE_SPACING;
                    shift = "TOP";
                    if (topShift == null) {
                        centerY = -(maxHeight ?? 0)/2;
                    } else {
                        centerY = topShift;
                    }
                    maxHeight = nextMaxHeight;
                    break;
            }
        }
        this.refreshMix();
        const viewWidth = this.maxNodeXPosition + MEASURES.SECTIONS_SEPARATOR + MEASURES.OUTPUT_WIDTH;
        this.translation.x = this._viewSize.x / 2 - viewWidth / 2 + (MEASURES.INPUT_WIDTH + MEASURES.SECTIONS_SEPARATOR * 0.5) / 2;
        if (this.translation.x < MEASURES.INPUT_WIDTH + MEASURES.SECTIONS_SEPARATOR) {
            this.translation.x = MEASURES.INPUT_WIDTH + MEASURES.SECTIONS_SEPARATOR;
        }
        this.translation.y = this._viewSize.y / 2;
    }

    private shiftNode(delta: Point, node: ElaborationNode): void {
        const oldPosition = this.nodePositions.get(node);
        if (oldPosition != null) {
            this.nodePositions.set(node, {
                x: oldPosition.x + delta.x,
                y: oldPosition.y + delta.y
            });
        }
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
        const stacks = Math.max(node.inputs.length + (node instanceof ArbitraryInputsElaborationNode ? 1 : 0), node.outputs.length);
        const height = MEASURES.NODE_HEADING_HEIGHT + MEASURES.NODE_CONNECTION_HEIGHT * stacks + MEASURES.NODE_INTERNAL_SPACING * (stacks + 1);
        this.nodePositions.set(node, {x: maxX, y: -height / 2 + MEASURES.NODE_HEADING_HEIGHT / 2});
        this.maxNodeXPosition = Math.max(this.maxNodeXPosition, maxX + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2);
        this._mix
            ?.connections
            .filter(connection => connection.drainType == ConnectionDrainType.OUTPUT)
            .forEach(connection => {this.updateConnection(connection);});
    }

    public updateNode(): void {
        this._mix
            ?.connections
            .filter(connection => connection.drainType == ConnectionDrainType.OUTPUT)
            .forEach(connection => {this.updateConnection(connection);});
    }

    public addConnection(connection: Connection): void {
        this.updateConnection(connection);
    }

    private updateConnection(connection: Connection): void {
        if (this._mix == null) {
            return;
        }
        let from: Point = {x: 0, y: 0};
        let to: Point   = {x: 0, y: 0};
        if (connection.sourceType === ConnectionSourceType.NODE) {
            const node = this._mix.nodes.find(a => a.id === connection.sourceNodeId);
            if (node == null) {
                return;
            }
            const datum = node.outputs.find(a => a.name == connection.sourceNodeOutputName);
            if (datum == null) {
                return;
            }
            from = this.getNodeConnectorPosition(node, datum, true);
        } else if (connection.sourceType === ConnectionSourceType.INPUT) {
            const datum = this._mix.imports.find(a => a.uniqueName == connection.inputName);
            if (datum == null) {
                return;
            }
            from = this.getExternalConnectorPosition(datum, true);
        }
        if (connection.drainType === ConnectionDrainType.NODE) {
            const node = this._mix.nodes.find(a => a.id === connection.drainNodeId);
            if (node == null) {
                return;
            }
            const datum = node.inputs.find(a => a.name == connection.drainNodeInputName);
            if (datum == null) {
                return;
            }
            to = this.getNodeConnectorPosition(node, datum, false);
            if (
                this.lockedInputs
                    .find(a => a.node.id == connection.drainNodeId && a.datum.name == connection.drainNodeInputName) == null
                && connection.sourceType != ConnectionSourceType.CONSTANT
            ) {
                this.lockedInputs.push({
                                           datum,
                                           input: true,
                                           node
                                       });
            }
        }
        if (connection.drainType === ConnectionDrainType.OUTPUT) {
            const datum = this._mix.outputs.find(otherDatum => otherDatum.name == connection.outputName);
            if (datum == null) {
                return;
            }
            to = this.getExternalConnectorPosition(datum, false);
            if (!this.lockedExternalOutputs.includes(datum) && connection.sourceType != ConnectionSourceType.CONSTANT) {
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
            ._mix
            ?.connections
            .forEach(connection => {
                if ((input && connection.sourceType == ConnectionSourceType.INPUT)
                    || (!input && connection.drainType == ConnectionDrainType.OUTPUT && connection.sourceType != ConnectionSourceType.CONSTANT)) {
                    this.updateConnection(connection);
                }
            });
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

    public getNodeConnectorPosition(node: ElaborationNode, connector: Datum, rightFacing: boolean, additional?: boolean): Point {
        if (rightFacing) {
            const from = this.getNodePosition(node);

            from.x += MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2;

            from.y += this.getNodeConnectionTop(node, node.outputs.indexOf(connector));
            from.y += this.getNodeConnectionsDisplacement(node, false);

            return from;
        } else {
            const to = this.getNodePosition(node);

            to.x += MEASURES.SECTIONS_SEPARATOR / 2;

            if (additional == true) {
                to.y += this.getNodeConnectionTop(node, node.inputs.length);
            } else {
                to.y += this.getNodeConnectionTop(node, node.inputs.indexOf(connector));
            }
            to.y += this.getNodeConnectionsDisplacement(node, true);

            return to;
        }
    }

    public getExternalConnectorPosition(connector: ExportedDatum | Datum, rightFacing: boolean): Point {
        if (rightFacing) {
            if (!(connector instanceof ExportedDatum)) {
                return {x: 0, y: 0};
            }
            const inputIndex = this._mix?.imports.indexOf(connector);
            if (inputIndex == null) {
                return {x: 0, y: 0};
            }
            return {
                x: -MEASURES.SECTIONS_SEPARATOR / 2,
                y: -this.inputsHeight / 2 + (MEASURES.INPUT_HEIGHT + MEASURES.INPUT_SPACING) * inputIndex + MEASURES.INPUT_HEIGHT / 2
            };
        } else {
            const inputIndex = this._mix?.outputs.indexOf(connector);
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
        if (this._mix == null) {
            return 0;
        }
        let inputsOnly: number;
        if (this._mix.imports.length != 0) {
            inputsOnly = this._mix.imports.length * MEASURES.INPUT_HEIGHT + (this._mix.imports.length - 1) * MEASURES.INPUT_SPACING;
        } else {
            if (this._mix.imports.length == this.availableExportsLength) {
                return 0;
            } else {
                return MEASURES.ADD_INPUT_HEIGHT;
            }
        }
        if (this._mix.imports.length == this.availableExportsLength) {
            return inputsOnly;
        } else {
            return MEASURES.ADD_INPUT_HEIGHT + MEASURES.INPUT_SPACING + inputsOnly;
        }
    }


    public get outputsHeight(): number {
        if (this._mix == null) {
            return 0;
        }
        let outputsOnly: number;

        if (this._mix.outputs.length != 0) {
            outputsOnly = this._mix.outputs.length * MEASURES.OUTPUT_HEIGHT + (this._mix.outputs.length - 1) * MEASURES.OUTPUT_SPACING;
        } else {
            return MEASURES.ADD_OUTPUT_HEIGHT;
        }

        if (this.showOutputAdd) {
            return MEASURES.ADD_OUTPUT_HEIGHT + MEASURES.OUTPUT_SPACING + outputsOnly;
        } else {
            return outputsOnly;
        }
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
                const drainNode = this._mix?.nodes.find(otherNode => otherNode.id == replacingConnection.drainNodeId);
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
                const sourceNode = this._mix?.nodes.find(otherNode => otherNode.id == replacingConnection.sourceNodeId);
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
                const drainExternalOutput = this._mix?.outputs.find(output => output.name == replacingConnection.outputName);
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
                const sourceExternalInput = this._mix?.imports.find(imp => imp.uniqueName == replacingConnection.inputName);
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
                      ._mix
                      ?.nodes
                      .filter(a => a.id != node.id)
                      .reduce((acc, otherNode) =>
                                  Math.max(acc, this.getNodePosition(otherNode).x + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2), 0) ?? 0;
        this.currentDragging ??= {
            type:                 DraggingElementType.NODE,
            node:                 node,
            startPosition:        {...this.getNodePosition(node)},
            startDrag:            pointerPosition,
            fallBackFurtherNodeX: fallbackNodeX
        };
    }

    public nodeConnectorMouseDown(node: ElaborationNode, datum: Datum | NodeInputInfo, rightFacing: boolean, event: MouseEvent): void {
        if (datum instanceof Datum) {
            this.connectorMouseDown({node, datum, external: false, rightFacing}, event, null);
        } else {
            this.connectorMouseDown({node, datum: datum.datum, external: false, rightFacing, specialAdditional: datum.specialInputAddMore}, event, null);
        }
    }

    public externalConnectorRightFacingMouseDown(datum: ExportedDatum, event: MouseEvent): void {
        this.connectorMouseDown({datum, external: true, rightFacing: true}, event, null);
    }

    public externalConnectorLeftFacingMouseDown(datum: Datum, event: MouseEvent): void {
        this.connectorMouseDown({datum, external: true, rightFacing: false}, event, null);
    }

    private connectorMouseDown(connector:
                                   { node: ElaborationNode, datum: Datum, external: false, rightFacing: true } |
                                   { node: ElaborationNode, datum: Datum, external: false, rightFacing: false, specialAdditional?: boolean } |
                                   { datum: ExportedDatum, external: true, rightFacing: true } |
                                   { datum: Datum, external: true, rightFacing: false },
                               event: MouseEvent,
                               replacingConnection: Connection | null): void {
        const pointerPosition = this.extractTransformedPosition(event);
        if ((event.button != 0) || (this._mix == null) || (this.currentDragging != null)) {
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
                    const drainNode  = this._mix.nodes.find(otherNode => otherNode.id == replacingConnection.drainNodeId);
                    const drainDatum = drainNode?.inputs.find(output => output.name == replacingConnection.drainNodeInputName);
                    if (drainNode != null && drainDatum != null) {
                        // No connection, we are creating a new one
                        to = this.getNodeConnectorPosition(drainNode, drainDatum, false);

                        newDragging.candidatePartner = {external: false, node: drainNode, datum: drainDatum, input: true};
                    }
                } else {
                    const output = this._mix.outputs.find(otherOutput => otherOutput.name == replacingConnection.outputName);
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
                    this._mix.connections.find(a => a.drainType == ConnectionDrainType.NODE && a.drainNodeId == connector.node.id && a.drainNodeInputName == connector.datum.name);
            } else {
                existingInConnection =
                    this._mix.connections.find(a => a.drainType == ConnectionDrainType.OUTPUT && a.outputName == connector.datum.name);
            }
            if (existingInConnection != null && existingInConnection != replacingConnection) {
                if (existingInConnection.sourceType == ConnectionSourceType.NODE) {
                    const sourceNode  = this._mix.nodes.find(otherNode => otherNode.id == existingInConnection.sourceNodeId);
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
                    const exportedDatum = this._mix.imports.find(otherExport => otherExport.uniqueName == existingInConnection.inputName);
                    if (exportedDatum != null) {
                        this.connectorMouseDown({datum: exportedDatum, external: true, rightFacing: true}, event, existingInConnection);
                    }
                }
                return;
            } else {
                // No connection, we are creating a new one

                let newDragging: DraggingToNodeInput | DraggingToExternalOutput;
                if (!connector.external) {
                    const to = this.getNodeConnectorPosition(connector.node, connector.datum, false, connector.specialAdditional == true);

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
                        },
                        isAdditional:     connector.specialAdditional == true
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
                    const sourceNode  = this._mix.nodes.find(otherNode => otherNode.id == replacingConnection.sourceNodeId);
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

    public nodeConnectorMouseMove(node: ElaborationNode, connector: Datum | NodeInputInfo, rightFacing: boolean): void {
        if (this._mix != null) {
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
                if (connector instanceof Datum) {
                    this.currentDragging.snapPosition     = this.getNodeConnectorPosition(node, connector, true);
                    this.currentDragging.candidatePartner = {external: false, node, datum: connector, input: false};
                } else if (!connector.specialInputAddMore) {
                    this.currentDragging.snapPosition     = this.getNodeConnectorPosition(node, connector.datum, true);
                    this.currentDragging.candidatePartner = {external: false, node, datum: connector.datum, input: false};
                }
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
                if (connector instanceof Datum) {
                    this.currentDragging.snapPosition     = this.getNodeConnectorPosition(node, connector, false);
                    this.currentDragging.candidatePartner = {external: false, node, datum: connector, input: true};
                } else {
                    this.currentDragging.snapPosition     = this.getNodeConnectorPosition(node, connector.datum, false, connector.specialInputAddMore);
                    this.currentDragging.candidatePartner = {external: false, node, datum: connector.datum, input: true, isArbitrary: connector.specialInputAddMore};
                }
            }
        }
    }

    public externalConnectorRightFacingMouseMove(connector: ExportedDatum): void {
        if (this._mix != null) {
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
        if (this._mix != null) {
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
            const newX = Math.max(0, this.currentDragging.startPosition.x + pointerPosition.x - this.currentDragging.startDrag.x);
            this.nodePositions.set(node, {
                x: newX,
                y: this.currentDragging.startPosition.y + pointerPosition.y - this.currentDragging.startDrag.y
            });
            this.maxNodeXPosition = Math.max(this.currentDragging.fallBackFurtherNodeX, newX + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2);
            this
                ._mix
                ?.connections
                .filter(a =>
                            (a.sourceType == ConnectionSourceType.NODE && a.sourceNodeId == node.id)
                            || (a.drainType == ConnectionDrainType.NODE && a.drainNodeId == node.id)
                            || (a.drainType == ConnectionDrainType.OUTPUT))
                .forEach(connection => { this.updateConnection(connection); });

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
        if ((this.currentDragging == null) || (this._mix == null)) {
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
                                let drainNodeInputName = this.currentDragging.candidatePartner.datum.name;
                                if (this.currentDragging.candidatePartner.isArbitrary === true) {
                                    if (this.currentDragging.candidatePartner.node instanceof ArbitraryInputsElaborationNode) {
                                        this.currentDragging.candidatePartner.node.addInput();
                                        drainNodeInputName = ArbitraryInputsElaborationNode.getInputName(this.currentDragging.candidatePartner.node.options.inputNumber - 1);
                                    }
                                }
                                newConnection = {
                                    sourceType:           ConnectionSourceType.NODE,
                                    sourceNodeId:         this.currentDragging.node.id,
                                    sourceNodeOutputName: this.currentDragging.outputName,
                                    drainType:            ConnectionDrainType.NODE,
                                    drainNodeId:          this.currentDragging.candidatePartner.node.id,
                                    drainNodeInputName: drainNodeInputName
                                };
                                if (this._mix.wouldAddCycle(newConnection)) {
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
                            let drainNodeInputName = this.currentDragging.candidatePartner.datum.name;
                            if (this.currentDragging.candidatePartner.isArbitrary === true) {
                                if (this.currentDragging.candidatePartner.node instanceof ArbitraryInputsElaborationNode) {
                                    this.currentDragging.candidatePartner.node.addInput();
                                    drainNodeInputName = ArbitraryInputsElaborationNode.getInputName(this.currentDragging.candidatePartner.node.options.inputNumber - 1);
                                }
                            }
                            newConnection = {
                                sourceType:         ConnectionSourceType.INPUT,
                                inputName:          this.currentDragging.inputName,
                                drainType:          ConnectionDrainType.NODE,
                                drainNodeId:        this.currentDragging.candidatePartner.node.id,
                                drainNodeInputName: drainNodeInputName
                            };
                            if (this._mix.wouldAddCycle(newConnection)) {
                                deleteOld = false;
                                createNew = false;
                            }
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
                    this._mix.removeConnection(this.currentDragging.replacingConnection);
                    this.emitChanges();
                    this.removeConnection(this.currentDragging.replacingConnection);
                }
            }
            if (createNew) {
                if (this.currentDragging.candidatePartner != null && newConnection != null) {
                    this._mix.addConnection(newConnection);
                    this.emitChanges();
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
                        let drainNodeInputName = this.currentDragging.inputName;
                        if (this.currentDragging.isAdditional === true) {
                            if (this.currentDragging.node instanceof ArbitraryInputsElaborationNode) {
                                this.currentDragging.node.addInput();
                                drainNodeInputName = ArbitraryInputsElaborationNode.getInputName(this.currentDragging.node.options.inputNumber - 1);
                            }
                        }
                        // Dragging from a node input
                        if (this.currentDragging.node != this.currentDragging.candidatePartner.node) {
                            newConnection = {
                                sourceType:           ConnectionSourceType.NODE,
                                sourceNodeId:         this.currentDragging.candidatePartner.node.id,
                                sourceNodeOutputName: this.currentDragging.candidatePartner.datum.name,
                                drainType:            ConnectionDrainType.NODE,
                                drainNodeId:          this.currentDragging.node.id,
                                drainNodeInputName: drainNodeInputName
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
                        let drainNodeInputName = this.currentDragging.inputName;
                        if (this.currentDragging.isAdditional === true) {
                            if (this.currentDragging.node instanceof ArbitraryInputsElaborationNode) {
                                this.currentDragging.node.addInput();
                                drainNodeInputName = ArbitraryInputsElaborationNode.getInputName(this.currentDragging.node.options.inputNumber - 1);
                            }
                        }
                        // Dragging from a node input
                        newConnection = {
                            sourceType:         ConnectionSourceType.INPUT,
                            inputName:          this.currentDragging.candidatePartner.datum.uniqueName,
                            drainType:          ConnectionDrainType.NODE,
                            drainNodeId:        this.currentDragging.node.id,
                            drainNodeInputName: drainNodeInputName
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
                    this._mix.addConnection(newConnection);
                    this.emitChanges();
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


    public addChangeCallback(callback: () => void): void {
        this.changeCallbacks.push(callback);
    }

    public removeChangeCallback(callback: () => void): void {
        this.changeCallbacks = this.changeCallbacks.filter(a => a != callback);
    }

    private emitChanges(): void {
        this.changeCallbacks.forEach(callback => {
            callback()
        });
    }

    public exportLayout(): MixLayout {
        return new MixLayout(
            recordFromEntries([...this.nodePositions.entries()].map(entry => [entry[0].id, entry[1]]))
        );
    }

    public importLayout(layout: MixLayout): void {
        if (this._mix != null) {
            this.maxNodeXPosition = 0;
            for (const node of this._mix.nodes) {
                const position = layout.nodePositions[node.id.toString()];
                if (position != null) {
                    this.nodePositions.set(node, position);
                    this.maxNodeXPosition = Math.max(this.maxNodeXPosition, position.x + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2);
                }
            }
            this
                ._mix
                .connections
                .forEach(connection => { this.updateConnection(connection); });
        }

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
    isArbitrary?: boolean;
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
    isAdditional?: boolean;
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

