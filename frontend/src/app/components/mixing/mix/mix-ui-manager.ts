import {Point} from '@angular/cdk/drag-drop';
import {ArbitraryInputsElaborationNode, ElaborationNode} from '@common/mixing/mix/elaboration-node';
import {Connection, ConnectionDrain, ConnectionDrainToNode, ConnectionDrainType, ConnectionSource, ConnectionSourceFromNode, ConnectionSourceType, Mix} from '@common/mixing/mix/mix';
import {Datum, DatumInfo, ElaborationNodeDatum, ExportedDatum} from '@common/mixing/mix/datum';
import {Line, MEASURES} from '../constants';
import {ResizeEvent} from '../../../directives/resize-event/resize-event.directive';
import {NodeInputInfo} from './mix.component';
import {MixLayout, NodeGroupJSON} from '@common/mixing/mix/mix-layout';
import {recordFromEntries} from '@common/utils/generics';

export class MixUiManager {

    public translation: Point = {x: MEASURES.SECTIONS_SEPARATOR + MEASURES.INPUT_WIDTH, y: 0};
    public scale: number      = 1;

    private nodePositions: Map<ElaborationNode, Point>                   = new Map<ElaborationNode, Point>();
    public visibleNodes: ElaborationNode[]                               = [];
    private maxNodeXPosition: number                                     = 0;
    private invisibleNodeCollapsedGroup: Map<ElaborationNode, NodeGroup> = new Map<ElaborationNode, NodeGroup>();

    public firstLevelGroups: NodeGroup[] = [];
    public allGroups: NodeGroup[]        = [];
    public visibleGroups: NodeGroup[]    = [];

    private connections: Map<Connection, Line>         = new Map<Connection, Line>();
    public hiddenConnections: Map<Connection, boolean> = new Map<Connection, boolean>();

    private lockedInputs: ElaborationNodeDatum[] = [];
    private lockedExternalOutputs: Datum[]       = [];

    private _mix: Mix | null = null;

    public availableExportsLength: number | null = null;

    public svgElement: HTMLElement | null = null;

    public showOutputAdd: boolean = true;

    private _viewSize: Point = {x: 0, y: 0};

    private changeCallbacks: (() => void)[] = [];

    public set mix(mix: Mix) {
        this._mix = mix;
        this.refreshMix();
        this.rearrangeNodes();
        this.calculateVisibleElements();
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
        this.recalculateMaxX();
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
        let maxHeight: number | null      = null;
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
            const ordered = [...placedParents.values()].sort(
                (a, b) => {
                    if (a.level == null || b.level == null) {
                        return 0;
                    }
                    return a.level - b.level;
                }
            );
            let y         = 0;
            let lastLevel = 0;
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
                    this.shiftNode({x: 0, y: -(levelHeights.get(treeNode.level) ?? 0) / 2}, treeNode.node);
                }
            }
        } else {
            // There is a cycle. All the nodes must be rearranged loosely, as if they weren't oriented.
            missingNodes = mix.nodes.slice();
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
        });

        const clusters: { seed: TreeNode, cluster: TreeNode[] }[] = [];
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
        let topShift: number | null                               = null;
        let bottomShift: number | null = null;
        let shift: 'CENTER' | 'TOP' | 'BOTTOM';
        if ((maxHeight == null) || (tree.length == 0)) {
            centerY = 0;
            shift = 'CENTER';
        } else {
            centerY = -maxHeight / 2 - MEASURES.NODE_SPACING;
            shift   = 'TOP';
        }
        for (const cluster of clusters) {
            let nextMaxHeight = 0;
            let x         = 0;
            for (const node of cluster.cluster) {
                const stacks = Math.max(node.node.inputs.length, node.node.outputs.length);
                const height = MEASURES.NODE_HEADING_HEIGHT + MEASURES.NODE_CONNECTION_HEIGHT * stacks + MEASURES.NODE_INTERNAL_SPACING * (stacks + 1);
                nextMaxHeight = Math.max(nextMaxHeight, height);
                this.nodePositions.set(node.node, {
                    x,
                    y: centerY - height / 2
                });
                x += MEASURES.NODE_WIDTH + MEASURES.NODE_SPACING;
            }
            switch (shift) {
                case 'TOP':
                    cluster.cluster.forEach(node => {this.shiftNode({x: 0, y: -nextMaxHeight / 2}, node.node);});
                    topShift = centerY - nextMaxHeight - MEASURES.NODE_SPACING;
                    shift = 'BOTTOM';
                    if (bottomShift == null) {
                        centerY = (maxHeight ?? 0) / 2;
                    } else {
                        centerY = bottomShift;
                    }
                    maxHeight = nextMaxHeight;
                    break;
                case 'CENTER':
                    centerY = -nextMaxHeight / 2 - MEASURES.NODE_SPACING;
                    shift   = 'TOP';
                    maxHeight = nextMaxHeight;
                    break;
                case 'BOTTOM':
                    cluster.cluster.forEach(node => {this.shiftNode({x: 0, y: nextMaxHeight / 2}, node.node);});
                    bottomShift = centerY + nextMaxHeight + MEASURES.NODE_SPACING;
                    shift   = 'TOP';
                    if (topShift == null) {
                        centerY = -(maxHeight ?? 0) / 2;
                    } else {
                        centerY = topShift;
                    }
                    maxHeight = nextMaxHeight;
                    break;
            }
        }
        this.allGroups.forEach(group => {group.collapsed = false;});
        this.visibleNodes = mix.nodes.slice();
        this.refreshMix();
        this.calculateVisibleElements();
        for (const group of this.firstLevelGroups) {
            this.recalculateGroupBounds(group);
        }
        this.recalculateMaxX();
        mix
            .connections
            .forEach(connection => {this.updateConnection(connection);});

        const viewWidth = this.maxNodeXPosition + MEASURES.SECTIONS_SEPARATOR + MEASURES.OUTPUT_WIDTH;
        this.translation.x = this._viewSize.x / 2 - viewWidth / 2 + (MEASURES.INPUT_WIDTH + MEASURES.SECTIONS_SEPARATOR * 0.5) / 2;
        if (this.translation.x < MEASURES.INPUT_WIDTH + MEASURES.SECTIONS_SEPARATOR) {
            this.translation.x = MEASURES.INPUT_WIDTH + MEASURES.SECTIONS_SEPARATOR;
        }
        this.translation.y = this._viewSize.y / 2;
    }

    private recalculateMaxX(): void {

        let nodeMaxX =
                this
                    .visibleNodes
                    .reduce((acc, otherNode) =>
                                Math.max(acc, this.getNodePosition(otherNode).x + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2), 0);
        for (const group of this.firstLevelGroups) {
            nodeMaxX = Math.max(nodeMaxX, group.displayX + group.displayWidth + MEASURES.SECTIONS_SEPARATOR / 2);
        }
        this.maxNodeXPosition = nodeMaxX;
    }

    private checkMinX(): void {

        if (this._mix != null) {
            let nodeMinX =
                    this
                        .visibleNodes
                        .reduce((acc, otherNode) =>
                                    Math.min(acc, this.getNodePosition(otherNode).x), 0);
            for (const group of this.firstLevelGroups) {
                nodeMinX = Math.min(nodeMinX, group.displayX);
            }
            if (nodeMinX < 0) {
                for (const node of this._mix.nodes) {
                    const position = this.getNodePosition(node);
                    position.x -= nodeMinX;
                    this.nodePositions.set(node, position);
                }
            }
            this.calculateVisibleElements();
            for (const group of this.firstLevelGroups) {
                this.recalculateGroupBounds(group);
            }
            this.recalculateMaxX();
            this._mix
                .connections
                .forEach(connection => {this.updateConnection(connection);});
        }
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
        this.visibleNodes.push(node);
    }

    public nodeDeleted(node: ElaborationNode): void {
        if (this._mix != null) {
            this.nodePositions.delete(node);
            const containingGroup =
                      NodeGroup.findParent(
                          node,
                          this._mix
                              .nodes
                              .concat([node])
                              .filter(otherNode =>
                                          !this.firstLevelGroups.some(otherGroup =>
                                                                          otherGroup.containsNode(otherNode)
                                          )
                              ),
                          this.firstLevelGroups
                      );
            if (containingGroup != null) {
                if (containingGroup != 'ROOT') {
                    containingGroup.nodes = containingGroup.nodes.filter(a => a != node);
                }
                this.calculateVisibleElements();
                for (const group of this.firstLevelGroups) {
                    this.recalculateGroupBounds(group);
                }
                this.recalculateMaxX();
                this._mix
                    .connections
                    .filter(connection => connection.drainType == ConnectionDrainType.OUTPUT)
                    .forEach(connection => {this.updateConnection(connection);});
            }
        }
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
        let fromHidden = false;
        let toHidden   = false;
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
            if (!this.visibleNodes.includes(node)) {
                fromHidden = true;
            }
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
            if (this.visibleNodes.includes(node)) {
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
            } else {
                toHidden = true;
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
        if (fromHidden && toHidden) {
            this.hiddenConnections.set(connection, true);
        } else {
            this.hiddenConnections.set(connection, false);
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
        if (this.visibleNodes.includes(node)) {
            if (rightFacing) {
                const from = this.getNodePosition(node);

                from.x += MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2;

                from.y += this.getConnectionTop(node.outputs.indexOf(connector));
                from.y += this.getConnectionsDisplacement(node, false);

                return from;
            } else {
                const to = this.getNodePosition(node);

                to.x += MEASURES.SECTIONS_SEPARATOR / 2;

                if (additional == true) {
                    to.y += this.getConnectionTop(node.inputs.length);
                } else {
                    to.y += this.getConnectionTop(node.inputs.indexOf(connector));
                }
                to.y += this.getConnectionsDisplacement(node, true);

                return to;
            }
        } else {
            const groupToAttach = this.invisibleNodeCollapsedGroup.get(node);
            if (groupToAttach != null) {
                return this.getGroupConnectorPosition(groupToAttach, node.id, connector, rightFacing);
            }
            return {x: 0, y: 0};
        }
    }

    public getGroupConnectorPosition(group: NodeGroup, nodeId: number, connector: Datum, rightFacing: boolean): Point {
        if (rightFacing) {
            const from = {
                x: group.x + (group.width - MEASURES.NODE_WIDTH) / 2,
                y: group.y
            };

            from.x += MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2;

            if (group.showConnectors) {
                from.y += this.getConnectionTop(group.outputs.findIndex(a => a.datum == connector));
                from.y += this.getConnectionsDisplacement(group, false);
                from.y += MEASURES.NODE_HEADING_HEIGHT / 2;
            } else {
                from.y += MEASURES.NODE_HEADING_HEIGHT / 2 + MEASURES.NODE_CONNECTION_HEIGHT + MEASURES.NODE_INTERNAL_SPACING * 1.5;
            }

            return from;
        } else {
            const to = {
                x: group.x + (group.width - MEASURES.NODE_WIDTH) / 2,
                y: group.y
            };

            to.x += MEASURES.SECTIONS_SEPARATOR / 2;

            if (group.showConnectors) {
                to.y += this.getConnectionTop(group.inputs.findIndex(a => a.datum == connector));
                to.y += this.getConnectionsDisplacement(group, true);
                to.y += MEASURES.NODE_HEADING_HEIGHT / 2;
            } else {
                to.y += MEASURES.NODE_HEADING_HEIGHT / 2 + MEASURES.NODE_CONNECTION_HEIGHT + MEASURES.NODE_INTERNAL_SPACING * 1.5;
            }

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

    public getConnectionsDisplacement(node: ElaborationNode | NodeGroup, left: boolean): number {
        const leftHeight  = MEASURES.NODE_CONNECTION_HEIGHT * node.inputs.length + MEASURES.NODE_INTERNAL_SPACING * (node.inputs.length - 1);
        const rightHeight = MEASURES.NODE_CONNECTION_HEIGHT * node.outputs.length + MEASURES.NODE_INTERNAL_SPACING * (node.outputs.length - 1);
        if (left) {
            return Math.max(0, (rightHeight - leftHeight) / 2);
        } else {
            return Math.max(0, (leftHeight - rightHeight) / 2);
        }
    }

    public getConnectionTop(index: number): number {
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
        let fallbackNodeX =
                this
                    .visibleNodes
                    .filter(a => a.id != node.id)
                    .reduce((acc, otherNode) =>
                                Math.max(acc, this.getNodePosition(otherNode).x + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2), 0);
        for (const group of this.firstLevelGroups) {
            fallbackNodeX = Math.max(fallbackNodeX, group.displayX + group.displayWidth + MEASURES.SECTIONS_SEPARATOR / 2);
        }
        this.currentDragging ??= {
            type:          DraggingElementType.NODE,
            hasMoved:      false,
            node:          node,
            startPosition: {...this.getNodePosition(node)},
            startDrag:     pointerPosition
        };
    }

    public isDraggingNode(node: ElaborationNode): boolean {
        return this.currentDragging?.type == DraggingElementType.NODE && this.currentDragging.node == node && this.currentDragging.hasMoved;
    }

    public groupMouseDown(group: NodeGroup, event: MouseEvent): void {
        const pointerPosition = this.extractTransformedPosition(event);
        if (event.button != 0) {
            return;
        }
        const allNodes    = group.allNodes;
        let fallbackNodeX =
                this
                    .visibleNodes
                    .filter(a => !allNodes.some(node => a.id == node.id))
                    .reduce((acc, otherNode) =>
                                Math.max(acc, this.getNodePosition(otherNode).x + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2), 0);
        for (const otherGroup of this.firstLevelGroups) {
            if (otherGroup != group) {
                fallbackNodeX = Math.max(fallbackNodeX, otherGroup.displayX + otherGroup.displayWidth + MEASURES.SECTIONS_SEPARATOR / 2);
            }
        }
        this.currentDragging ??= {
            type:               DraggingElementType.GROUP,
            hasMoved:           false,
            group,
            nodeStartPositions: allNodes.map(node => this.getNodePosition(node)),
            startPosition:      {x: group.displayX, y: group.y},
            startDrag:          pointerPosition
        };
    }

    public isDraggingGroup(group: NodeGroup): boolean {
        return this.currentDragging?.type == DraggingElementType.GROUP && this.currentDragging.group == group && this.currentDragging.hasMoved;
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

    public groupHeaderMove(group: NodeGroup): void {
        if (this.currentDragging != null && (this.currentDragging.type == DraggingElementType.GROUP || this.currentDragging.type == DraggingElementType.NODE)) {
            this.currentDragging.moveToGroup = group;
            if (this.currentDragging.type == DraggingElementType.NODE) {
                this.currentDragging.snapPosition = {x: group.displayX + group.displayWidth * 0.5 - MEASURES.NODE_WIDTH * 0.5, y: group.y + MEASURES.NODE_HEADING_HEIGHT * 1.5};
            } else {
                if (group == this.currentDragging.group) {
                    this.currentDragging.moveToGroup = undefined;
                    return;
                }
                this.currentDragging.snapPosition =
                    {x: group.displayX + group.displayWidth * 0.5 - this.currentDragging.group.displayWidth * 0.5, y: group.y + MEASURES.NODE_HEADING_HEIGHT * 1.5};
            }
        }
    }

    public groupHeaderLeave(): void {
        if (this.currentDragging != null && (this.currentDragging.type == DraggingElementType.GROUP || this.currentDragging.type == DraggingElementType.NODE)) {
            this.currentDragging.moveToGroup  = undefined;
            this.currentDragging.snapPosition = undefined;
        }
    }

    public mouseMove(event: MouseEvent): void {
        const pointerPosition = this.extractTransformedPosition(event);
        if (this.currentDragging == null) {
            return;
        }
        if (this.currentDragging.type == DraggingElementType.NODE) {
            this.currentDragging.hasMoved = true;
            const node                    = this.currentDragging.node;
            let newX;
            let newY;
            if (this.currentDragging.snapPosition != null) {
                newX = this.currentDragging.snapPosition.x;
                newY = this.currentDragging.snapPosition.y;
            } else {
                newX = Math.max(0, this.currentDragging.startPosition.x + pointerPosition.x - this.currentDragging.startDrag.x);
                newY = this.currentDragging.startPosition.y + pointerPosition.y - this.currentDragging.startDrag.y;
            }
            this.nodePositions.set(node, {
                x: newX,
                y: newY
            });
            this.recalculateMaxX();
            this
                ._mix
                ?.connections
                .filter(a =>
                            (a.sourceType == ConnectionSourceType.NODE && a.sourceNodeId == node.id)
                            || (a.drainType == ConnectionDrainType.NODE && a.drainNodeId == node.id)
                            || (a.drainType == ConnectionDrainType.OUTPUT))
                .forEach(connection => { this.updateConnection(connection); });
            const containingGroup = this.firstLevelGroups.find(nodeGroup => nodeGroup.containsNode(node));
            if (containingGroup != null) {
                this.recalculateGroupBounds(containingGroup);
            }
        } else if (this.currentDragging.type == DraggingElementType.GROUP) {
            this.currentDragging.hasMoved = true;
            const group                   = this.currentDragging.group;
            let newX;
            let newY;
            if (this.currentDragging.snapPosition != null) {
                newX = this.currentDragging.snapPosition.x;
                newY = this.currentDragging.snapPosition.y;
            } else {
                newX = Math.max(0, this.currentDragging.startPosition.x + pointerPosition.x - this.currentDragging.startDrag.x);
                newY = this.currentDragging.startPosition.y + pointerPosition.y - this.currentDragging.startDrag.y;
            }
            const deltaX = newX - this.currentDragging.startPosition.x;
            const deltaY = newY - this.currentDragging.startPosition.y;
            // group.x           = newX;
            // group.y           = newY;
            let maxX          = newX;
            const nodesToMove = group.allNodes;
            for (let i = 0; i < nodesToMove.length; i++) {
                const node        = nodesToMove[i];
                const oldPosition = this.currentDragging.nodeStartPositions[i];
                if (oldPosition == null || node == null) {
                    continue;
                }
                const newNodeX = oldPosition.x + deltaX;
                if (newNodeX > maxX) {
                    maxX = newNodeX;
                }
                this.nodePositions.set(node, {
                    x: newNodeX,
                    y: oldPosition.y + deltaY
                });
            }
            this.recalculateMaxX();
            this
                ._mix
                ?.connections
                .filter(a =>
                            (a.sourceType == ConnectionSourceType.NODE && nodesToMove.some(node => a.sourceNodeId == node.id))
                            || (a.drainType == ConnectionDrainType.NODE && nodesToMove.some(node => a.drainNodeId == node.id))
                            || (a.drainType == ConnectionDrainType.OUTPUT))
                .forEach(connection => { this.updateConnection(connection); });
            const containingGroup = this.firstLevelGroups.find(nodeGroup => nodeGroup.containsGroup(group));
            if (containingGroup != null) {
                this.recalculateGroupBounds(containingGroup);
            } else {
                this.recalculateGroupBounds(group);
            }
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
        if (this.currentDragging.type == DraggingElementType.NODE) {
            if (this.currentDragging.moveToGroup != null) {
                this.switchGroup(this.currentDragging.node, this.currentDragging.moveToGroup);
            }
            if (this.currentDragging.hasMoved) {
                this.emitChanges();
            }
        }
        if (this.currentDragging.type == DraggingElementType.GROUP) {
            if (this.currentDragging.moveToGroup != null) {
                this.switchGroup(this.currentDragging.group, this.currentDragging.moveToGroup);
            }
            if (this.currentDragging.hasMoved) {
                this.emitChanges();
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
            callback();
        });
    }

    public exportLayout(): MixLayout {
        return new MixLayout(
            recordFromEntries([...this.nodePositions.entries()].map(entry => [entry[0].id, entry[1]])),
            this.allGroups.map(group => group.toJSON(this.allGroups))
        );
    }

    public importLayout(layout: MixLayout): void {
        const mix = this._mix;
        if (mix != null) {
            this.maxNodeXPosition = 0;
            for (const node of mix.nodes) {
                const position = layout.nodePositions[node.id.toString()];
                if (position != null) {
                    this.nodePositions.set(node, position);
                    this.maxNodeXPosition = Math.max(this.maxNodeXPosition, position.x + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2);
                }
            }
            const groups = layout.groups.map(group => NodeGroup.fromJSON(group, mix.nodes));
            for (let i = 0; i < groups.length; i++) {
                const group     = groups[i];
                const groupJSON = layout.groups[i];
                if (groupJSON != null) {
                    group?.fromJSONAdjust(groupJSON, groups);
                }
            }
            this.allGroups        = groups;
            this.firstLevelGroups = groups.filter(group => group.parent == null);

            this.allGroups.forEach(group => {
                group.updateInputs(mix.connections);
            });

            this.calculateVisibleElements();
            for (const otherGroup of this.firstLevelGroups) {
                this.recalculateGroupBounds(otherGroup);
            }
            this.recalculateMaxX();
            for (const connection of mix.connections) {
                this.updateConnection(connection);
            }
        }

    }

    // GROUP HANDLING

    public createGroup(newGroupElements: (ElaborationNode | NodeGroup)[]): void {
        if (this._mix != null) {
            const sampleElement = newGroupElements[0];
            if (sampleElement == null) {
                return;
            }
            if (!this.canFormGroup(newGroupElements)) {
                return;
            }
            const containingGroup =
                      NodeGroup.findParent(
                          sampleElement,
                          this._mix
                              .nodes
                              .filter(node =>
                                          !this.firstLevelGroups.some(otherGroup =>
                                                                          otherGroup.containsNode(node)
                                          )
                              ),
                          this.firstLevelGroups
                      );
            if (containingGroup != null) {
                const newGroup     = new NodeGroup();
                newGroup.nodes     = newGroupElements.filter(element => element instanceof ElaborationNode);
                newGroup.subGroups = newGroupElements.filter(element => element instanceof NodeGroup);
                if (containingGroup === 'ROOT') {
                    this.recalculateGroupBounds(newGroup);
                    newGroup.parent       = null;
                    newGroup.level        = 0;
                    this.firstLevelGroups = this.firstLevelGroups.filter(group => !newGroup.subGroups.includes(group));
                    this.firstLevelGroups.push(newGroup);
                } else {
                    if (containingGroup.nodes.length + containingGroup.subGroups.length == newGroupElements.length) {
                        return;
                    }
                    newGroup.parent           = containingGroup;
                    newGroup.level            = containingGroup.level + 1;
                    containingGroup.subGroups = containingGroup.subGroups.filter(group => !newGroup.subGroups.includes(group));
                    containingGroup.nodes     = containingGroup.nodes.filter(node => !newGroup.nodes.includes(node));
                    containingGroup.subGroups.push(newGroup);
                    this.recalculateGroupBounds(containingGroup);
                }
                newGroup.subGroups.forEach(subGroup => {
                    subGroup.parent = newGroup;
                });
                this.allGroups.push(newGroup);
                this.visibleGroups.push(newGroup);
                this.visibleGroups.sort((a, b) => a.level - b.level);
                if (newGroup.x < 0) {
                    for (const node of this._mix.nodes) {
                        const oldPosition = this.nodePositions.get(node);
                        if (oldPosition != null) {
                            oldPosition.x -= newGroup.x;
                        }
                    }
                }
            }
            this.calculateVisibleElements();
            for (const otherGroup of this.firstLevelGroups) {
                this.recalculateGroupBounds(otherGroup);
            }
            this.recalculateMaxX();
            for (const connection of this._mix.connections) {
                this.updateConnection(connection);
            }
            this.emitChanges();

        }
    }

    public switchGroup(element: ElaborationNode | NodeGroup, toGroup: NodeGroup): void {
        if (this._mix != null) {
            if (element instanceof ElaborationNode) {
                const containingGroup =
                          NodeGroup.findParent(
                              element,
                              this._mix
                                  .nodes
                                  .filter(node =>
                                              !this.firstLevelGroups.some(otherGroup =>
                                                                              otherGroup.containsNode(node)
                                              )
                                  ),
                              this.firstLevelGroups
                          );
                if (containingGroup != null) {
                    if (containingGroup != 'ROOT') {
                        containingGroup.nodes = containingGroup.nodes.filter(node => node != element);
                    }
                }
                toGroup.nodes.push(element);
                const oldPosition = this.nodePositions.get(element);
                const stacks      = Math.max(element.inputs.length, element.outputs.length);
                if (oldPosition != null) {
                    this.nodePositions.set(element, {
                        x: oldPosition.x,
                        y: oldPosition.y - (MEASURES.NODE_HEADING_HEIGHT / 2 + MEASURES.NODE_CONNECTION_HEIGHT * stacks + MEASURES.NODE_INTERNAL_SPACING * (stacks + 1)) -
                           MEASURES.GROUP_PADDING
                    });
                }
            } else {
                if (element.parent != null) {
                    element.parent.subGroups = element.parent.subGroups.filter(otherGroup => otherGroup != element);
                } else {
                    this.firstLevelGroups = this.firstLevelGroups.filter(otherGroup => otherGroup != element);
                }
                toGroup.subGroups.push(element);
                element.parent = toGroup;
                element.level  = toGroup.level + 1;
                element.allNodes.forEach(node => {
                    const oldPosition = this.nodePositions.get(node);
                    if (oldPosition != null) {
                        this.nodePositions.set(node, {
                            x: oldPosition.x,
                            y: oldPosition.y - toGroup.displayHeight - MEASURES.GROUP_PADDING
                        });
                    }
                });
            }
            this.calculateVisibleElements();
            for (const group of this.firstLevelGroups) {
                this.recalculateGroupBounds(group);
            }
            this.recalculateMaxX();
            for (const connection of this._mix.connections) {
                this.updateConnection(connection);
            }
            this.emitChanges();
        }
    }

    public deleteGroup(group: NodeGroup): void {
        if (this._mix != null) {
            this.allGroups = this.allGroups.filter(otherGroup => otherGroup != group);
            if (group.parent != null) {
                group.parent.subGroups = group.parent.subGroups.filter(otherGroup => otherGroup != group);
                group.parent.nodes.push(...group.nodes);
                for (const subGroup of group.subGroups) {
                    subGroup.parent = group.parent;
                    group.parent.subGroups.push(subGroup);
                    group.level = subGroup.parent.level + 1;
                }
            } else {
                this.firstLevelGroups = this.firstLevelGroups.filter(otherGroup => otherGroup != group);
                for (const subGroup of group.subGroups) {
                    subGroup.parent = group.parent;
                    this.firstLevelGroups.push(subGroup);
                    group.level = 0;
                }
            }
            this.calculateVisibleElements();
            for (const otherGroup of this.firstLevelGroups) {
                this.recalculateGroupBounds(otherGroup);
            }
            this.recalculateMaxX();
            for (const connection of this._mix.connections) {
                this.updateConnection(connection);
            }
            this.emitChanges();
        }
    }

    public degroup(elements: (NodeGroup | ElaborationNode)[]): void {
        if (this._mix != null) {
            for (const element of elements) {
                if (element instanceof ElaborationNode) {
                    const containingGroup =
                              NodeGroup.findParent(
                                  element,
                                  this._mix
                                      .nodes
                                      .filter(node =>
                                                  !this.firstLevelGroups.some(otherGroup =>
                                                                                  otherGroup.containsNode(node)
                                                  )
                                      ),
                                  this.firstLevelGroups
                              );
                    if (containingGroup != null) {
                        if (containingGroup != 'ROOT') {
                            containingGroup.nodes = containingGroup.nodes.filter(node => node != element);
                        }
                    }
                } else {
                    if (element.parent != null) {
                        element.parent.subGroups = element.parent.subGroups.filter(group => group != element);
                        this.firstLevelGroups.push(element);
                        element.parent = null;
                        element.level  = 0;
                    }
                }
            }
            this.calculateVisibleElements();
            for (const otherGroup of this.firstLevelGroups) {
                this.recalculateGroupBounds(otherGroup);
            }
            this.recalculateMaxX();
            for (const connection of this._mix.connections) {
                this.updateConnection(connection);
            }
            this.emitChanges();
        }
    }

    public canFormGroup(newGroupElements: (ElaborationNode | NodeGroup)[]): boolean {
        if (this._mix != null) {
            const result = NodeGroup
                .checkElementsAreSiblings(
                    newGroupElements,
                    this._mix
                        .nodes
                        .filter(node =>
                                    !this.firstLevelGroups.some(group =>
                                                                    group.containsNode(node)
                                    )
                        ),
                    this.firstLevelGroups
                );
            // We don't care if the answer is no or unknown, if we haven't found out now the answer is no
            return result === true;
        }
        return false;
    }

    public calculateVisibleElements(): void {
        if (this._mix != null) {
            const nodesToRemove: ElaborationNode[] = [];
            const groupsToRemove: NodeGroup[]      = [];
            for (const group of this.firstLevelGroups) {
                nodesToRemove.push(...group.collapsedNodes);
                groupsToRemove.push(...group.collapsedGroups);
            }
            for (const node of nodesToRemove) {
                const parent = NodeGroup.findParent(node, [], this.firstLevelGroups);
                if (parent != null && parent != 'ROOT') {
                    let bubble: NodeGroup | null           = parent;
                    let highestCollapsed: NodeGroup | null = null;
                    while (bubble != null) {
                        if (bubble.collapsed) {
                            highestCollapsed = bubble;
                        }
                        bubble = bubble.parent;
                    }
                    if (highestCollapsed != null) {
                        this.invisibleNodeCollapsedGroup.set(node, highestCollapsed);
                    }
                }
            }
            this.visibleNodes  = this._mix.nodes.filter(node => !nodesToRemove.includes(node));
            this.visibleGroups = this.allGroups.filter(group => !groupsToRemove.includes(group));
            this.visibleGroups.sort((a, b) => a.level - b.level);
        }
    }

    public toggleCollapsedGroup(group: NodeGroup): void {
        group.collapsed = !group.collapsed;
        this.calculateVisibleElements();
        if (this._mix != null) {
            group.updateInputs(this._mix.connections);
            for (const connection of this._mix.connections) {
                this.updateConnection(connection);
            }
            for (const firstLevelGroup of this.firstLevelGroups) {
                this.recalculateGroupBounds(firstLevelGroup);
            }
            this.recalculateMaxX();
            this.checkMinX();
            this.emitChanges();
        }
    }

    public toggleShowConnectorsGroup(group: NodeGroup): void {
        group.showConnectors = !group.showConnectors;
        this.calculateVisibleElements();
        this.recalculateMaxX();
        if (this._mix != null) {
            group.updateInputs(this._mix.connections);
            for (const connection of this._mix.connections) {
                this.updateConnection(connection);
            }
            for (const firstLevelGroup of this.firstLevelGroups) {
                this.recalculateGroupBounds(firstLevelGroup);
            }
        }
        this.emitChanges();
    }

    private recalculateGroupBounds(group: NodeGroup): Rect {
        const positions: Rect[] = group.nodes
                                       .map(node => {
                                           const stacks = Math.max(node.inputs.length, node.outputs.length);
                                           const height = MEASURES.NODE_HEADING_HEIGHT / 2 + MEASURES.NODE_CONNECTION_HEIGHT * stacks + MEASURES.NODE_INTERNAL_SPACING * (stacks + 1);
                                           return ({
                                               x:     this.nodePositions.get(node)?.x ?? 0,
                                               y:     this.nodePositions.get(node)?.y ?? 0,
                                               height,
                                               width: MEASURES.NODE_WIDTH
                                           });
                                       });
        positions.push(...group.subGroups.map(subGroup => this.recalculateGroupBounds(subGroup)));
        const firstNodeX = Math.min(...positions.map(position => position.x));
        const firstNodeY = Math.min(...positions.map(position => position.y));
        const lastNodeX  = Math.max(...positions.map(position => position.x + position.width));
        const lastNodeY  = Math.max(...positions.map(position => position.y + position.height));
        group.x          = firstNodeX - MEASURES.GROUP_PADDING;
        group.y          = firstNodeY - MEASURES.GROUP_PADDING - MEASURES.NODE_HEADING_HEIGHT;
        group.width      = lastNodeX - firstNodeX + 2 * MEASURES.GROUP_PADDING;
        group.height     = lastNodeY - firstNodeY + 2 * MEASURES.GROUP_PADDING + MEASURES.NODE_HEADING_HEIGHT;
        return {
            x:      group.displayX,
            y:      group.y,
            width:  group.displayWidth,
            height: group.displayHeight
        };
    }

}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

enum DraggingElementType {
    NODE,
    GROUP,
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
    hasMoved: boolean,
    node: ElaborationNode,
    startPosition: Point,
    startDrag: Point,
    moveToGroup?: NodeGroup,
    snapPosition?: Point
}

interface DraggingGroup {
    type: DraggingElementType.GROUP,
    hasMoved: boolean,
    group: NodeGroup,
    startPosition: Point,
    nodeStartPositions: Point[],
    startDrag: Point,
    moveToGroup?: NodeGroup
    snapPosition?: Point
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

type DraggingElement = DraggingNode | DraggingGroup | DraggingBackground | DraggingFromNodeOutput | DraggingToNodeInput | DraggingFromExternalInput | DraggingToExternalOutput;

export class NodeGroup {

    public name: string = 'Group';

    public nodes: ElaborationNode[] = [];

    public subGroups: NodeGroup[] = [];

    public collapsed: boolean      = false;
    public showConnectors: boolean = true;

    public inputs: { datum: Datum, nodeId: number }[]  = [];
    public outputs: { datum: Datum, nodeId: number }[] = [];

    public inputAliases: { datumName: string, nodeId: number, alias: string }[]  = [];
    public outputAliases: { datumName: string, nodeId: number, alias: string }[] = [];

    public parent: NodeGroup | null = null;
    private _level: number          = 0;

    public x: number      = 0;
    public y: number      = 0;
    public width: number  = 0;
    public height: number = 0;

    constructor() {}

    public get level(): number {
        return this._level;
    }

    public set level(level: number) {
        this.subGroups.forEach(group => {group.level = level + 1;});
        this._level = level;
    }

    public containsNode(node: ElaborationNode): boolean {
        return this.nodes.includes(node) || this.subGroups.some(subGroup => subGroup.containsNode(node));
    }

    public containsGroup(group: NodeGroup): boolean {
        return this.subGroups.includes(group) || this.subGroups.some(subGroup => subGroup.containsGroup(group));
    }

    public elementsAreSiblings(elements: (ElaborationNode | NodeGroup)[]): boolean | null {
        return NodeGroup.checkElementsAreSiblings(elements, this.nodes, this.subGroups);
    }

    public get allNodes(): ElaborationNode[] {
        return this.nodes.concat(...this.subGroups.flatMap(subGroup => subGroup.allNodes));
    }

    public get allGroups(): NodeGroup[] {
        return this.subGroups.concat(...this.subGroups.flatMap(subGroup => subGroup.allGroups));
    }

    public get collapsedNodes(): ElaborationNode[] {
        if (this.collapsed) {
            return this.allNodes;
        } else {
            return this.subGroups.flatMap(group => group.collapsedNodes);
        }
    }

    public get displayHeight(): number {
        if (this.collapsed) {
            if (this.showConnectors) {
                const stacks = Math.max(this.inputs.length, this.outputs.length);
                return MEASURES.NODE_HEADING_HEIGHT + MEASURES.NODE_CONNECTION_HEIGHT * stacks + MEASURES.NODE_INTERNAL_SPACING * (stacks + 1);
            } else {
                return MEASURES.NODE_HEADING_HEIGHT / 2 + MEASURES.NODE_CONNECTION_HEIGHT * 2 + MEASURES.NODE_INTERNAL_SPACING * 3;
            }
        } else {
            return this.height;
        }
    }

    public get displayWidth(): number {
        return this.collapsed ? MEASURES.NODE_WIDTH : this.width;
    }

    public get displayX(): number {
        return this.collapsed ? this.x + (this.width - MEASURES.NODE_WIDTH) / 2 : this.x;
    }

    public updateInputs(connections: readonly Connection[]): void {
        const allNodes = this.allNodes;
        this.inputs    = [];
        this.outputs   = [];
        for (const node of allNodes) {
            const nodeExternalInConnections = connections.filter((connection): connection is ConnectionSource & ConnectionDrainToNode => {
                if (connection.drainType != ConnectionDrainType.NODE || connection.drainNodeId != node.id) {
                    return false;
                }
                if (connection.sourceType != ConnectionSourceType.NODE) {
                    return connection.sourceType != ConnectionSourceType.CONSTANT;
                }
                return !allNodes.some(otherNode => otherNode.id == connection.sourceNodeId);
            });
            this.inputs.push(...node
                .inputs
                .filter(input =>
                            nodeExternalInConnections.some(connection =>
                                                               connection.drainNodeInputName == input.name
                            )
                )
                .map(input => ({datum: input, nodeId: node.id}))
            );

            const nodeExternalOutConnections = connections.filter((connection): connection is ConnectionSourceFromNode & ConnectionDrain => {
                if (connection.sourceType != ConnectionSourceType.NODE || connection.sourceNodeId != node.id) {
                    return false;
                }
                if (connection.drainType != ConnectionDrainType.NODE) {
                    return true;
                }
                return !allNodes.some(otherNode => otherNode.id == connection.drainNodeId);
            });
            this.outputs.push(...node
                .outputs
                .filter(output =>
                            nodeExternalOutConnections.some(connection =>
                                                                connection.sourceNodeOutputName == output.name
                            )
                )
                .map(output => ({datum: output, nodeId: node.id}))
            );
        }
    }

    public get collapsedGroups(): NodeGroup[] {
        if (this.collapsed) {
            return this.allGroups;
        } else {
            return this.subGroups.flatMap(group => group.collapsedGroups);
        }
    }

    public findParent(element: ElaborationNode | NodeGroup): NodeGroup | null {
        const result = NodeGroup.findParent(element, this.nodes, this.subGroups);
        if (result == 'ROOT') {
            return this;
        } else {
            return result;
        }
    }

    public changeAlias(datum: { datum: Datum; nodeId: number }, value: string, isInput: boolean): void {
        const aliases  = isInput ? this.inputAliases : this.outputAliases;
        const oldAlias = aliases
            .find(alias =>
                      alias.datumName == datum.datum.name
                      && alias.nodeId == datum.nodeId);
        if (oldAlias != null) {
            oldAlias.alias = value;
        } else {
            aliases.push({
                             datumName: datum.datum.name,
                             nodeId:    datum.nodeId,
                             alias:     value
                         });
        }
    }

    public getAlias(datum: { datum: Datum; nodeId: number }, isInput: boolean): string | null {
        const aliases = isInput ? this.inputAliases : this.outputAliases;
        return aliases
                   .find(alias =>
                             alias.datumName == datum.datum.name
                             && alias.nodeId == datum.nodeId)?.alias ?? null;
    }

    public toJSON(allGroups: NodeGroup[]): NodeGroupJSON {
        return {
            name:           this.name,
            nodeIds:        this.nodes.map(node => node.id),
            subGroupIds:    this.subGroups.map(subGroup => allGroups.indexOf(subGroup)),
            collapsed:      this.collapsed,
            showConnectors: this.showConnectors,
            inputAliases:   this.inputAliases,
            outputAliases:  this.outputAliases,
            parentId:       this.parent != null ? allGroups.indexOf(this.parent) : null,
            level:          this.level
        };
    }

    public fromJSONAdjust(nodeGroupJSON: NodeGroupJSON, allGroups: NodeGroup[]): void {
        this.subGroups = nodeGroupJSON.subGroupIds.map(subGroupId => allGroups[subGroupId]).filter(subGroup => subGroup != null);
        this.parent    = nodeGroupJSON.parentId != null ? allGroups[nodeGroupJSON.parentId] ?? null : null;
    }

    public static fromJSON(nodeGroupJSON: NodeGroupJSON, allNodes: readonly ElaborationNode[]): NodeGroup {
        const result          = new NodeGroup();
        result.name           = nodeGroupJSON.name;
        result.nodes          = nodeGroupJSON
            .nodeIds
            .map(nodeId =>
                     allNodes
                         .find(node => node.id == nodeId))
            .filter(node => node != null);
        result.collapsed      = nodeGroupJSON.collapsed;
        result.showConnectors = nodeGroupJSON.showConnectors;
        result.inputAliases   = nodeGroupJSON.inputAliases;
        result.outputAliases  = nodeGroupJSON.outputAliases;
        result._level         = nodeGroupJSON.level;
        return result;
    }

    public static findParent(element: ElaborationNode | NodeGroup, nodes: ElaborationNode[], subGroups: NodeGroup[]): NodeGroup | null | 'ROOT' {
        if (element instanceof ElaborationNode) {
            if (nodes.includes(element)) {
                return 'ROOT';
            }
        } else {
            if (subGroups.includes(element)) {
                return 'ROOT';
            }
        }
        for (const subGroup of subGroups) {
            const parent = subGroup.findParent(element);
            if (parent != null) {
                return parent;
            }
        }
        return null;
    }

    public static checkElementsAreSiblings(elements: (ElaborationNode | NodeGroup)[], nodes: ElaborationNode[], subGroups: NodeGroup[]): boolean | null {
        const areDirectChildren = elements.map(element => {
            if (element instanceof ElaborationNode) {
                return nodes.includes(element);
            } else {
                return subGroups.includes(element);
            }
        });
        if (areDirectChildren.every(a => a)) {
            // If all elements are children of this, they are all siblings
            return true;
        } else if (areDirectChildren.every(a => !a)) {
            // If none of the elements are children of this, they may be siblings in the children groups
            if (subGroups.length == 0) {
                // We don't have any subgroup, so we cannot say anything about them being siblings or not.
                return null;
            } else {
                for (const subGroup of subGroups) {
                    const elementsAreSiblings = subGroup.elementsAreSiblings(elements);
                    if (elementsAreSiblings === true) {
                        // If a subgroup definitely has the nodes as siblings, the answer is true and we don't care about anywhere else
                        return true;
                    } else if (elementsAreSiblings === false) {
                        // If in the subgroup the check failed, we are assured they'll never be siblings, so we report back
                        return false;
                    }
                    // Otherwise we don't know, so we keep searching in the other subgroups
                }
                // We haven't found evidence either way, we cannot say anything for sure
                return null;
            }
        } else {
            // Otherwise we have some that are sibling but not all, so there's no way they all are somewhere else. So we stop and return false.
            return false;
        }
    }
}
