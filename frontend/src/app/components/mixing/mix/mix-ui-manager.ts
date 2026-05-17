/**
 *  This module contains the {@link MixUiManager|`MixUiManager`} class and other support class for the {@link MixComponent|`MixComponent`}.
 *
 *  @module
 */
import {Point} from '@angular/cdk/drag-drop';
import {ArbitraryInputsElaborationNode, ElaborationNode} from '@common/mixing/mix/elaboration-node';
import {Connection, ConnectionDrain, ConnectionDrainToNode, ConnectionDrainType, ConnectionSource, ConnectionSourceFromNode, ConnectionSourceType, Mix} from '@common/mixing/mix/mix';
import {Datum, DatumInfo, ElaborationNodeDatum, ExportedDatum} from '@common/mixing/mix/datum';
import {Line, MEASURES} from '../constants';
import {ResizeEvent} from '../../../directives/resize-event/resize-event.directive';
// noinspection ES6UnusedImports
import type {MixComponent} from './mix.component';
import {NodeInputInfo} from './mix.component';
import {MixLayout, NodeGroupJSON} from '@common/mixing/mix/mix-layout';
import {recordFromEntries} from '@common/utils/generics';

/**
 * A class to handle all the UI operations for the main SVG canvas in the
 * {@link MixComponent|`MixComponent`} {@link Mix|`Mix`} editing view.
 *
 * This class handles the calculation of the graphical components, their positions,
 * mouse events, the creation of new {@link Connection|`Connection`s} and
 * {@link ElaborationNode|`ElaborationNode`s}.
 */
export class MixUiManager {

    /** The current translation of all the elements on the canvas, to allow panning. */
    public translation: Point = {x: MEASURES.SECTIONS_SEPARATOR + MEASURES.INPUT_WIDTH, y: 0};
    /** The current scale of all the elements on the canvas, to allow zooming. */
    public scale: number      = 1;

    /** The coordinates of every {@link ElaborationNode|`ElaborationNode`} in the {@link MixUiManager#mix|`mix`}, keyed by the {@link ElaborationNode|`ElaborationNode`} itself. */
    private nodePositions: Map<ElaborationNode, Point> = new Map<ElaborationNode, Point>();
    /** This list contains all the {@link ElaborationNode|`ElaborationNode`s} in the {@link MixUiManager#mix|`mix`} that are not descendant of a collapsed {@link NodeGroup|`NodeGroup`}. */
    public visibleNodes: ElaborationNode[]             = [];
    /** The x position of the right edge of the rightmost visible {@link ElaborationNode|`ElaborationNode`} in the {@link MixUiManager#mix|`mix`}. Beyond that, only exports are shown. */
    private maxNodeXPosition: number                   = 0;

    /**
     * A map containing each collapsed {@link ElaborationNode|`ElaborationNode`}'s topmost collapsed {@link NodeGroup|`NodeGroup`} ancestor, that is currently preventing it to be shown.
     * If a node is not in this map, it is visible. Keys are the {@link ElaborationNode|`ElaborationNode`} themselves.
     */
    private invisibleNodeCollapsedGroup: Map<ElaborationNode, NodeGroup> = new Map<ElaborationNode, NodeGroup>();

    /** All the {@link NodeGroup|`NodeGroup`s} in the {@link MixUiManager#mix|`mix`} that are not child of other {@link NodeGroup|`NodeGroup`s}. */
    public firstLevelGroups: NodeGroup[] = [];
    /** All the {@link NodeGroup|`NodeGroup`s} in the {@link MixUiManager#mix|`mix`}. */
    public allGroups: NodeGroup[]        = [];
    /** This list contains all the {@link NodeGroup|`NodeGroup`s} in the {@link MixUiManager#mix|`mix`} that are not descendant of a collapsed {@link NodeGroup|`NodeGroup`}. */
    public visibleGroups: NodeGroup[]    = [];

    /** All the {@link Connection|`Connection`s} position in the {@link MixUiManager#mix|`mix`}, keyed by the {@link Connection|`Connection`} itself. */
    private connections: Map<Connection, Line>         = new Map<Connection, Line>();
    /** A map containing whether the {@link Connection|`Connection`s} in the {@link MixUiManager#mix|`mix`} are hidden because they are between two hidden {@link ElaborationNode|`ElaborationNode`s}, keyed by the {@link Connection|`Connection`} itself. */
    public hiddenConnections: Map<Connection, boolean> = new Map<Connection, boolean>();

    /** All the {@link ElaborationNode#inputs|`inputs`} that cannot be used for {@link MixUiManager#connections|`connections`} because they are already used in one. */
    private lockedInputs: ElaborationNodeDatum[] = [];
    /** All the {@link Mix#outputs|`outputs`} that cannot be used for {@link MixUiManager#connections|`connections`} because they are already used in one. */
    private lockedExternalOutputs: Datum[]       = [];

    /** The {@link Mix|`Mix`} currently being displayed in the editor. */
    private _mix: Mix | null = null;

    /** The SVG canvas {@link HTMLElement|`HTMLElement`} displaying the {@link MixUiManager#mix|`mix`}. */
    public svgElement: HTMLElement | null = null;

    /** Whether to show or hide the "Add output" button under the outputs. If `false`, the outputs are fixed and cannot be added or removed. */
    public showOutputAdd: boolean = true;

    /** {@link Point|`Point`} containing the width and height of the viewable area of the {@link MixUiManager#svgElement|`svgElement`}. */
    private _viewSize: Point = {x: 0, y: 0};

    /**
     * The list of registered change callbacks.
     *
     * @see {@link MixUiManager#addChangeCallback| `addChangeCallback()`}.
     */
    private changeCallbacks: (() => void)[] = [];

    /** Change the currently displayed {@link Mix|`Mix`} and recalculate all the view elements. */
    public set mix(mix: Mix) {
        this._mix = mix;
        this.refreshMix();
        this.rearrangeNodes();
        this.calculateVisibleElements();
    }

    /** Adjust the current viewable area of the {@link MixUiManager#svgElement|`svgElement`} after a resize event on it is received.  */
    public set viewSize(resizeEvent: ResizeEvent) {
        this._viewSize = {x: resizeEvent.width, y: resizeEvent.height};
    }

    /** The center of the current viewable area of the {@link MixUiManager#svgElement|`svgElement`} in the scaled and translated coordinates (coordinates that are coherent with the {@link MixUiManager#nodePositions|`nodePositions`}. */
    public get screenCenter(): Point {
        return {
            x: (-this.translation.x + (this.svgElement?.getBoundingClientRect().width ?? 0) / 2) / this.scale,
            y: (-this.translation.y + (this.svgElement?.getBoundingClientRect().height ?? 0) / 2) / this.scale
        };
    }

    /** This function refreshes all the changes made to the mix that are not easily catchable. */
    public refreshMix(): void {
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

    /**
     * Recalculate {@link ElaborationNode|`ElaborationNode`s}' positions by rearranging them following the structure of their dependencies.
     *
     * @throws {Error} If the layout cannot be recalculated due to an internal inconsistency in the tree structure.
     */
    public rearrangeNodes(): void {
        const mix = this._mix;
        if (mix == null) {
            return;
        }

        const tree: TreeNode[]              = [];
        const sourceTreeNodes: TreeNode[]   = [];
        const connections                   = mix.connections.slice();
        let missingNodes: ElaborationNode[] = mix.nodes.slice();
        let maxHeight: number | null        = null;
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
            const ordered      = [...placedParents.values()].sort(
                (a, b) => {
                    if (a.level == null || b.level == null) {
                        return 0;
                    }
                    return a.level - b.level;
                }
            );
            let y              = 0;
            let lastLevel      = 0;
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
                const stacks = Math.max(this.getNodeInputCount(treeNode.node), treeNode.node.outputs.length);
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
        let topShift: number | null    = null;
        let bottomShift: number | null = null;
        let shift: 'CENTER' | 'TOP' | 'BOTTOM';
        if ((maxHeight == null) || (tree.length == 0)) {
            centerY = 0;
            shift   = 'CENTER';
        } else {
            centerY = -maxHeight / 2 - MEASURES.NODE_SPACING;
            shift   = 'TOP';
        }
        for (const cluster of clusters) {
            let nextMaxHeight = 0;
            let x             = 0;
            for (const node of cluster.cluster) {
                const stacks  = Math.max(this.getNodeInputCount(node.node), node.node.outputs.length);
                const height  = MEASURES.NODE_HEADING_HEIGHT + MEASURES.NODE_CONNECTION_HEIGHT * stacks + MEASURES.NODE_INTERNAL_SPACING * (stacks + 1);
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
                    shift    = 'BOTTOM';
                    if (bottomShift == null) {
                        centerY = (maxHeight ?? 0) / 2;
                    } else {
                        centerY = bottomShift;
                    }
                    maxHeight = nextMaxHeight;
                    break;
                case 'CENTER':
                    centerY   = -nextMaxHeight / 2 - MEASURES.NODE_SPACING;
                    shift     = 'TOP';
                    maxHeight = nextMaxHeight;
                    break;
                case 'BOTTOM':
                    cluster.cluster.forEach(node => {this.shiftNode({x: 0, y: nextMaxHeight / 2}, node.node);});
                    bottomShift = centerY + nextMaxHeight + MEASURES.NODE_SPACING;
                    shift       = 'TOP';
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

        const viewWidth    = this.maxNodeXPosition + MEASURES.SECTIONS_SEPARATOR + MEASURES.OUTPUT_WIDTH;
        this.translation.x = this._viewSize.x / 2 - viewWidth / 2 + (MEASURES.INPUT_WIDTH + MEASURES.SECTIONS_SEPARATOR * 0.5) / 2;
        if (this.translation.x < MEASURES.INPUT_WIDTH + MEASURES.SECTIONS_SEPARATOR) {
            this.translation.x = MEASURES.INPUT_WIDTH + MEASURES.SECTIONS_SEPARATOR;
        }
        this.translation.y = this._viewSize.y / 2;
    }

    /** Update the value of {@link MixUiManager#maxNodeXPosition|`maxNodeXPosition`}. */
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

    /** Check whether some operation pushed some visible {@link ElaborationNode|`ElaborationNode`s} out of bounds before the 0 x coordinate, move the {@link ElaborationNode|`ElaborationNode`s} and recalculate all the positions accordingly. */
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

    /**
     * Move an {@link ElaborationNode|`ElaborationNode`} by a specific `delta`.
     *
     * @param {Point} delta - The coordinates to add to the {@link ElaborationNode|`ElaborationNode`}'s current position.
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} to move.
     */
    private shiftNode(delta: Point, node: ElaborationNode): void {
        const oldPosition = this.nodePositions.get(node);
        if (oldPosition != null) {
            this.nodePositions.set(node, {
                x: oldPosition.x + delta.x,
                y: oldPosition.y + delta.y
            });
        }
    }

    /**
     * Register the addition of an {@link ElaborationNode|`ElaborationNode`} to the {@link MixUiManager#mix|`mix`}
     * by calculating all the values for its graphical representation and recalculating related ones.
     *
     * @param {ElaborationNode} node - The newly added {@link ElaborationNode|`ElaborationNode`}.
     */
    public addNode(node: ElaborationNode): void {
        const stacks  = Math.max(this.getNodeInputCount(node), node.outputs.length);
        const height  = MEASURES.NODE_HEADING_HEIGHT + MEASURES.NODE_CONNECTION_HEIGHT * stacks + MEASURES.NODE_INTERNAL_SPACING * (stacks + 1);
        const center  = this.screenCenter;
        const centerX = center.x - MEASURES.SECTIONS_SEPARATOR / 2;
        const centerY = center.y;
        this.nodePositions.set(node, {x: Math.max(0, centerX - MEASURES.NODE_WIDTH / 2), y: centerY - height / 2});
        this.maxNodeXPosition = Math.max(this.maxNodeXPosition, centerX + MEASURES.NODE_WIDTH / 2);
        this._mix
            ?.connections
            .filter(connection => connection.drainType == ConnectionDrainType.OUTPUT)
            .forEach(connection => {this.updateConnection(connection);});
        this.visibleNodes.push(node);
    }

    /**
     * Register the removal of an {@link ElaborationNode|`ElaborationNode`} from the {@link MixUiManager#mix|`mix`}
     * by removing all the values for its graphical representation and recalculating related ones.
     *
     * @param {ElaborationNode} node - The removed {@link ElaborationNode|`ElaborationNode`}.
     */
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

    /**
     * Update all the connections linked to an {@link ElaborationNode|`ElaborationNode`} after changes on the {@link ElaborationNode|`ElaborationNode`}'s position or size.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} that was updated.
     */
    public updateNode(node: ElaborationNode): void {
        this._mix
            ?.connections
            .filter(connection =>
                        (connection.drainType == ConnectionDrainType.NODE && connection.drainNodeId == node.id && connection.sourceType != ConnectionSourceType.CONSTANT)
                        || (connection.sourceType == ConnectionSourceType.NODE && connection.sourceNodeId == node.id)
            )
            .forEach(connection => {this.updateConnection(connection);});
    }

    /**
     * Register the addition of a {@link Connection|`Connection`} to the {@link MixUiManager#mix|`mix`} by recalculating all the values for its graphical representation.
     *
     * @param {Connection} connection - The newly added {@link Connection|`Connection`}.
     */
    public addConnection(connection: Connection): void {
        this.updateConnection(connection);
    }

    /**
     * Update the graphical representation of a {@link Connection|`Connection`} in the {@link MixUiManager#mix|`mix`} after some action may have changed its characteristics.
     *
     * @param {Connection} connection - The newly added {@link Connection|`Connection`}.
     */
    private updateConnection(connection: Connection): void {
        if (this._mix == null) {
            return;
        }
        let from: Point                 = {x: 0, y: 0};
        let to: Point                   = {x: 0, y: 0};
        let fromHidden                  = false;
        let toHidden                    = false;
        let fromGroup: NodeGroup | null = null;
        let toGroup: NodeGroup | null   = null;
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
                fromGroup  = this.invisibleNodeCollapsedGroup.get(node) ?? null;
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
                toGroup  = this.invisibleNodeCollapsedGroup.get(node) ?? null;
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
        if (fromHidden && toHidden && fromGroup == toGroup) {
            this.hiddenConnections.set(connection, true);
        } else {
            this.hiddenConnections.set(connection, false);
        }
        this.connections.set(connection, {from, to});
    }

    /**
     * Register the removal of a {@link Connection|`Connection`} from the {@link MixUiManager#mix|`mix`}
     * by removing all the values for its graphical representation and recalculating related ones.
     *
     * @param {Connection} connection - The removed {@link Connection|`Connection`}.
     */
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

    /**
     * Update the graphical representation of all {@link Connection|`Connection`s} in the {@link MixUiManager#mix|`mix`}
     * that are connected either to {@link Mix#outputs|`outputs`} or from {@link Mix#inputs|`inputs`}.
     *
     * @param {boolean} input - If `true`, only connections from {@link Mix#inputs|`inputs`} are recalculated,
     *                          if `false`, only the ones to {@link Mix#outputs|`outputs`}.
     */
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

    /**
     * Check if an {@link ElaborationNode#inputs|`input`} to an {@link ElaborationNode|`ElaborationNode`}
     * can be used for a {@link Connection|`Connection`} or if it's already used in another one.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} to check.
     * @param {Datum} datum - The {@link Datum|`Datum`} representing the {@link ElaborationNode#inputs|`input`} to check.
     * @returns {boolean} - If `true`, the {@link ElaborationNode#inputs|`input`} is already connected to something,
     *                      if `false` it can be used in a new {@link Connection|`Connection`}.
     */
    public isInputLocked(node: ElaborationNode, datum: Datum): boolean {
        return this.lockedInputs.some(a => a.node == node && a.datum == datum);
    }

    /**
     * Check if an {@link Mix#outputs|`output`} in the {@link MixUiManager#mix|`mix`} to an {@link ElaborationNode|`ElaborationNode`}
     * can be used for a {@link Connection|`Connection`} or if it's already used in another one.
     *
     * @param {Datum} datum - The {@link Mix#outputs|`output`} to check.
     * @returns {boolean} - If `true`, the {@link Mix#outputs|`output`} is already connected to something,
     *                      if `false` it can be used in a new {@link Connection|`Connection`}.
     */
    public isExternalOutputLocked(datum: Datum): boolean {
        return this.lockedExternalOutputs.includes(datum);
    }

    /**
     * Get the coordinates of an {@link ElaborationNode|`ElaborationNode`} in the {@link MixUiManager#mix|`mix`}.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} to get the position of.
     * @returns {Point} - The coordinates of the {@link ElaborationNode|`ElaborationNode`}.
     */
    public getNodePosition(node: ElaborationNode): Point {
        return {...this.nodePositions.get(node) ?? {x: 0, y: 0}};
    }

    /**
     * Change the position of an {@link ElaborationNode|`ElaborationNode`} in the {@link Mix|`Mix`}.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} to set the position of.
     * @param {Point} position - The new coordinates of the {@link ElaborationNode|`ElaborationNode`}.
     */
    public setNodePosition(node: ElaborationNode, position: Point): void {
        this.nodePositions.set(node, position);
        this.maxNodeXPosition = Math.max(this.maxNodeXPosition, position.x + MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2);
    }


    /**
     * Calculate the position of a connector on an {@link ElaborationNode|`ElaborationNode`}.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} the connector is a part of.
     * @param {Datum} connector - The {@link Datum|`Datum`} of the {@link ElaborationNode#inputs|`input`} or {@link ElaborationNode#outputs|`output`} to get the position of.
     * @param {boolean} rightFacing - If `true`, the `connector` is on the right side of the {@link ElaborationNode|`ElaborationNode`} (it's an {@link ElaborationNode#outputs|`output`}),
     *                                if `false`, the `connector` is on the left side of the {@link ElaborationNode|`ElaborationNode`} (it's an {@link ElaborationNode#inputs|`input`}).
     * @param {boolean} additional - Whether the {@link Datum|`Datum`} is the new additional input connector in a {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`}.
     *                               `null` is equivalent to `false`.
     * @returns {Point} - The coordinates of the connector, in the global space (the same as the position of the {@link ElaborationNode|`ElaborationNode`})..
     */
    public getNodeConnectorPosition(node: ElaborationNode, connector: Datum, rightFacing: boolean, additional?: boolean): Point {
        if (this.visibleNodes.includes(node)) {
            if (rightFacing) {
                const from = this.getNodePosition(node);

                from.x += MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2;

                from.y += this.getConnectorTop(node.outputs.indexOf(connector));
                from.y += this.getConnectionsDisplacement(node, false);

                return from;
            } else {
                const to = this.getNodePosition(node);

                to.x += MEASURES.SECTIONS_SEPARATOR / 2;

                if (additional == true) {
                    to.y += this.getConnectorTop(node.inputs.length);
                } else {
                    to.y += this.getConnectorTop(node.inputs.indexOf(connector));
                }
                to.y += this.getConnectionsDisplacement(node, true);

                return to;
            }
        } else {
            const groupToAttach = this.invisibleNodeCollapsedGroup.get(node);
            if (groupToAttach != null) {
                return this.getGroupConnectorPosition(groupToAttach, connector, rightFacing);
            }
            return {x: 0, y: 0};
        }
    }

    /**
     * Calculate the position of a connector on an {@link NodeGroup|`NodeGroup`}.
     *
     * @param {NodeGroup} group - The {@link NodeGroup|`NodeGroup`} the connector is a part of.
     * @param {Datum} connector - The {@link Datum|`Datum`} of the {@link ElaborationNode#inputs|`input`} or {@link ElaborationNode#outputs|`output`} to get the position of.
     * @param {boolean} rightFacing - If `true`, the `connector` is on the right side of the {@link NodeGroup|`NodeGroup`} (it's an {@link ElaborationNode#outputs|`output`}),
     *                                if `false`, the `connector` is on the left side of the {@link NodeGroup|`NodeGroup`} (it's an {@link ElaborationNode#inputs|`input`}).
     *                               `null` is equivalent to `false`.
     * @returns {Point} - The coordinates of the connector, in the global space (the same as the position of the {@link ElaborationNode|`ElaborationNode`})..
     */
    public getGroupConnectorPosition(group: NodeGroup, connector: Datum, rightFacing: boolean): Point {
        if (rightFacing) {
            const from = {
                x: group.x + (group.width - MEASURES.NODE_WIDTH) / 2,
                y: group.y
            };

            from.x += MEASURES.NODE_WIDTH + MEASURES.SECTIONS_SEPARATOR / 2;

            if (group.showConnectors) {
                from.y += this.getConnectorTop(group.outputs.findIndex(a => a.datum == connector));
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
                to.y += this.getConnectorTop(group.inputs.findIndex(a => a.datum == connector));
                to.y += this.getConnectionsDisplacement(group, true);
                to.y += MEASURES.NODE_HEADING_HEIGHT / 2;
            } else {
                to.y += MEASURES.NODE_HEADING_HEIGHT / 2 + MEASURES.NODE_CONNECTION_HEIGHT + MEASURES.NODE_INTERNAL_SPACING * 1.5;
            }

            return to;
        }
    }

    /**
     * Calculate the position of a connector on a {@link Mix#imports|`Mix import`} or {@link Mix#outputs|`Mix output`}.
     *
     * @param {Datum} connector - The {@link Datum|`Datum`} of the {@link Mix#imports|`import`} or {@link Mix#outputs|`output`} to get the position of.
     * @param {boolean} rightFacing - If `true`, the `connector` is an {@link Mix#imports|`import`},
     *                                if `false`, the `connector` is an {@link Mix#outputs|`output`}.
     *                               `null` is equivalent to `false`.
     * @returns {Point} - The coordinates of the connector, in the global space (the same as the position of the {@link ElaborationNode|`ElaborationNode`})..
     */
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
            const outputIndex = this._mix?.outputs.indexOf(connector);
            if (outputIndex == null) {
                return {x: 0, y: 0};
            }
            return {
                x: this.outputsPosition,
                y: -this.outputsHeight / 2 + (MEASURES.OUTPUT_HEIGHT + MEASURES.OUTPUT_SPACING) * outputIndex + MEASURES.OUTPUT_HEIGHT / 2
            };
        }
    }

    /**
     * Gets the position of a {@link Connection|`Connection`} in the {@link MixUiManager#mix|`mix`}, in the coordinates of the global space (the same as the position of the
     * {@link ElaborationNode|`ElaborationNode`s}).
     *
     * @param {Connection} connection - The {@link Connection|`Connection`} to get the position of.
     * @returns {Line | null} The position of the connection, as a copy of the {@link Line|`Line`} between the coordinates of source point of the {@link Connection|`Connection`} and the
     *     drain point of the {@link Connection|`Connection`}.
     */
    public getConnectionPosition(connection: Connection): Line | null {
        const position = this.connections.get(connection);
        if (position == null) {
            return null;
        }
        return {...position};
    }

    /**
     * Gets the position of the connection currently being dragged, if any.
     *
     * @returns {Line | null} - The position of the connection, as a copy of the {@link Line|`Line`} between the coordinates of source point of the
     *                          {@link Connection|`Connection`} and the drain point of the {@link Connection|`Connection`}.
     *                          `null` means nothing is being dragged or the dragging doesn't involve a {@link Connection|`Connection`}.
     */
    public get draggingConnection(): Line | null {
        if (this.currentDragging == null) {
            return null;
        }
        if ((this.currentDragging.type == DraggingElementType.LINK_FROM_NODE_OUTPUT) || (this.currentDragging.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)) {
            return {from: this.currentDragging.connection.from, to: this.currentDragging.snapPosition ?? this.currentDragging.connection.to};
        } else if ((this.currentDragging.type == DraggingElementType.LINK_TO_NODE_INPUT) || (this.currentDragging.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT)) {
            return {from: this.currentDragging.snapPosition ?? this.currentDragging.connection.from, to: this.currentDragging.connection.to};
        }
        return null;
    }

    /**
     * Gets the {@link DatumInfo|`DatumInfo`} about the start of the {@link Connection|`Connection`} currently being dragged.
     *
     * @returns {DatumInfo | null} The {@link DatumInfo|`DatumInfo`}. `null` means nothing is being dragged or the dragging doesn't involve a {@link Connection|`Connection`}.
     */
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

    /** When the {@link Connection|`Connection`} being dragged is an existing one being moved from one of its ends, this is such {@link Connection|`Connection`}. `null` means nothing is being dragged or the dragging doesn't involve an existing {@link Connection|`Connection`}. */
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

    /**
     * For an {@link ElaborationNode|`ElaborationNode`} or {@link NodeGroup|`NodeGroup`}, gives how much the input or output connectors
     * should be shifted down vertically to match with the ones on the other side of the  {@link ElaborationNode|`ElaborationNode`}
     * or {@link NodeGroup|`NodeGroup`} to be visually centered.
     *
     * @param {ElaborationNode | NodeGroup} node - The {@link ElaborationNode|`ElaborationNode`} or {@link NodeGroup|`NodeGroup`} the connectors are displayed on.
     * @param {boolean} left - If `true`, this calculation gives the displacement of the input connectors with respect to the output ones, `false` for the other way around.
     * @returns {number} - The distance the connectors should be moved down vertically.
     */
    public getConnectionsDisplacement(node: ElaborationNode | NodeGroup, left: boolean): number {

        const inputCount  = this.getNodeInputCount(node);
        const leftHeight  = MEASURES.NODE_CONNECTION_HEIGHT * inputCount + MEASURES.NODE_INTERNAL_SPACING * (inputCount - 1);
        const rightHeight = MEASURES.NODE_CONNECTION_HEIGHT * node.outputs.length + MEASURES.NODE_INTERNAL_SPACING * (node.outputs.length - 1);
        if (left) {
            return Math.max(0, (rightHeight - leftHeight) / 2);
        } else {
            return Math.max(0, (leftHeight - rightHeight) / 2);
        }
    }

    /**
     * Get the vertical position of an input or output connector at a specific index inside an {@link ElaborationNode|`ElaborationNode`} or {@link NodeGroup|`NodeGroup`}.
     *
     * @param {number} index - The index of the connector in its side.
     * @returns {number} - The vertical position of the connector with respect to the top of the input or output block.
     */
    public getConnectorTop(index: number): number {
        return MEASURES.NODE_HEADING_HEIGHT / 2 + MEASURES.NODE_INTERNAL_SPACING * (index + 1) + MEASURES.NODE_CONNECTION_HEIGHT * (index + 0.5);
    }

    /**
     * Get the total number of input connectors on an {@link ElaborationNode|`ElaborationNode`} or {@link NodeGroup|`NodeGroup`}.
     *
     * @param {ElaborationNode | NodeGroup} node - The {@link ElaborationNode|`ElaborationNode`} or {@link NodeGroup|`NodeGroup`} to get the input count of.
     * @returns {number} - The total number of input connectors.
     */
    public getNodeInputCount(node: ElaborationNode | NodeGroup): number {
        if (node instanceof ArbitraryInputsElaborationNode) {
            return node.inputs.length + 1;
        } else {
            return node.inputs.length;
        }
    }

    /**
     * Get the total height of all the {@link MixUiManager#mix|`mix`}'s {@link Mix#imports|`import`},
     * in the coordinates of the global space (the same as the position of the {@link ElaborationNode|`ElaborationNode`}).
     *
     * @returns {number} - The total height.
     */
    public get inputsHeight(): number {
        if (this._mix == null) {
            return 0;
        }
        let inputsOnly: number;
        if (this._mix.imports.length != 0) {
            inputsOnly = this._mix.imports.length * MEASURES.INPUT_HEIGHT + (this._mix.imports.length - 1) * MEASURES.INPUT_SPACING;
        } else {
            return MEASURES.ADD_INPUT_HEIGHT;
        }
        return MEASURES.ADD_INPUT_HEIGHT + MEASURES.INPUT_SPACING + inputsOnly;
    }

    /**
     * Get the total height of all the {@link MixUiManager#mix|`mix`}'s {@link Mix#outputs|`outputs`},
     * in the coordinates of the global space (the same as the position of the {@link ElaborationNode|`ElaborationNode`}).
     *
     * @returns {number} - The total height.
     */
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

    /**
     * The x coordinate where to draw the {@link MixUiManager#mix|`mix`}'s {@link Mix#outputs|`outputs`},
     * in the coordinates of the global space (the same as the position of the {@link ElaborationNode|`ElaborationNode`}).
     *
     * @returns {number} - The x coordinate.
     */
    public get outputsPosition(): number {
        return this.maxNodeXPosition + MEASURES.SECTIONS_SEPARATOR;
    }

    /**
     * Change the order of a {@link MixUiManager#mix|`mix`}'s {@link Mix#imports|`import`}.
     *
     * @param {ExportedDatum} datum - The {@link Mix#imports|`import`} to move.
     * @param {boolean} forwards - If `true`, the {@link Mix#imports|`import`} will be shifted one position forwards
     *                             in the list, if `false` it will be shifted one position backwards.
     */
    public moveImport(datum: ExportedDatum, forwards: boolean): void {
        if (this._mix != null) {
            this._mix.moveImport(datum, forwards);
            for (const connection of this._mix.connections) {
                this.updateConnection(connection);
            }
            this.emitChanges();
        }
    }

    /**
     * Change the order of a {@link MixUiManager#mix|`mix`}'s {@link Mix#outputs|`output`}.
     *
     * @param {ExportedDatum} datum - The {@link Mix#outputs|`output`} to move.
     * @param {boolean} forwards - If `true`, the {@link Mix#outputs|`output`} will be shifted one position forwards
     *                             in the list, if `false` it will be shifted one position backwards.
     */
    public moveOutput(datum: Datum, forwards: boolean): void {
        if (this._mix != null) {
            this._mix.moveOutput(datum, forwards);
            for (const connection of this._mix.connections) {
                this.updateConnection(connection);
            }
            this.emitChanges();
        }
    }

    /** Information about the element currently being dragged. */
    private currentDragging: DraggingElement | null = null;

    /** Whether a {@link Connection|`Connection`} is currently being dragged towards a left-facing connector. */
    public get draggingConnectionForInput(): boolean {
        return (this.currentDragging?.type == DraggingElementType.LINK_FROM_NODE_OUTPUT) || (this.currentDragging?.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT);
    }

    /** Whether a {@link Connection|`Connection`} is currently being dragged towards a right-facing connector. */
    public get draggingConnectionForOutput(): boolean {
        return (this.currentDragging?.type == DraggingElementType.LINK_TO_NODE_INPUT) || (this.currentDragging?.type == DraggingElementType.LINK_TO_EXTERNAL_OUTPUT);
    }

    /**
     * If a {@link Connection|`Connection`} is currently being dragged towards a left-facing connector and is substituting an
     * existing {@link Connection|`Connection`} towards an {@link ElaborationNode|`ElaborationNode`}, this is the
     * {@link ElaborationNode#inputs|`input`} the original {@link Connection|`Connection`} was pointing to, or `null` in any other case.
     */
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

    /**
     * If a {@link Connection|`Connection`} is currently being dragged towards a right-facing connector and is substituting an
     * existing {@link Connection|`Connection`} from an {@link ElaborationNode|`ElaborationNode`}, this is the
     * {@link ElaborationNode#outputs|`output`} the original {@link Connection|`Connection`} was coming from, or `null` in any other case.
     */
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

    /**
     * If a {@link Connection|`Connection`} is currently being dragged towards a left-facing connector substituting an
     * existing {@link Connection|`Connection`} towards an {@link Mix#outputs|`output`}, this is the
     * {@link Mix#outputs|`output`} the original {@link Connection|`Connection`} was pointing to, or `null` in any other case.
     */
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

    /**
     * If a {@link Connection|`Connection`} is currently being dragged towards a right-facing connector and is substituting an
     * existing {@link Connection|`Connection`} from an {@link Mix#imports|`import`}, this is the
     * {@link Mix#imports|`import`} the original {@link Connection|`Connection`} was coming from, or `null` in any other case.
     */
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

    /**
     * Transform the screen coordinate in a {@link MouseEvent|`MouseEvent`} to one in the global space (the same as the position of the {@link ElaborationNode|`ElaborationNode`}).
     *
     * @param {MouseEvent} event - The DOM event to extract the coordinates from.
     * @returns {Point} - The transformed global space coordinates, in {@link Point|`Point`} form.
     */
    private extractTransformedPosition(event: MouseEvent): Point {
        return {x: (event.clientX - this.translation.x) / this.scale, y: (event.clientY - this.translation.y) / this.scale};
    }

    /**
     * Elaborate a mousedown event on the background.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    public backgroundMouseDown(event: MouseEvent): void {
        if (this.currentDragging != null) {
            return;
        }
        this.currentDragging = {
            type:             DraggingElementType.BACKGROUND,
            startTranslation: {...this.translation},
            startDrag:        {x: event.clientX, y: event.clientY}
        };
    }

    /** The cursor that the background should show. */
    public get backgroundCursor(): string {
        if (this.currentDragging == null || this.currentDragging.type == DraggingElementType.BACKGROUND) {
            return 'move';
        } else {
            return 'default';
        }
    }

    /** Whether the background is currently being dragged. */
    public get draggingBackground(): boolean {
        return this.currentDragging == null || this.currentDragging.type == DraggingElementType.BACKGROUND;
    }

    /**
     * Elaborate the mousedown event on an {@link ElaborationNode|`ElaborationNode`}.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} that received the {@link MouseEvent|`MouseEvent`}.
     * @param {MouseEvent} event - The DOM event.
     */
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

    /**
     * Whether an {@link ElaborationNode|`ElaborationNode`} is currently being dragged.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} to check.
     * @returns {boolean} The {@link ElaborationNode|`ElaborationNode`} is currently being dragged.
     */
    public isDraggingNode(node: ElaborationNode): boolean {
        return this.currentDragging?.type == DraggingElementType.NODE && this.currentDragging.node == node && this.currentDragging.hasMoved;
    }

    /**
     * Elaborate the mousedown event on a {@link NodeGroup|`NodeGroup`}.
     *
     * @param {ElaborationNode} group - The {@link NodeGroup|`NodeGroup`} that received the {@link MouseEvent|`MouseEvent`}.
     * @param {MouseEvent} event - The DOM event.
     */
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

    /**
     * Whether a {@link NodeGroup|`NodeGroup`} is currently being dragged.
     *
     * @param {NodeGroup} group - The {@link NodeGroup|`NodeGroup`} to check.
     * @returns {boolean} The {@link NodeGroup|`NodeGroup`} is currently being dragged.
     */
    public isDraggingGroup(group: NodeGroup): boolean {
        return this.currentDragging?.type == DraggingElementType.GROUP && this.currentDragging.group == group && this.currentDragging.hasMoved;
    }

    /**
     * Elaborate the mousedown event on an {@link ElaborationNode|`ElaborationNode`}'s connector.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} containing the connector that received the {@link MouseEvent|`MouseEvent`}.
     * @param {Datum | NodeInputInfo} datum - The {@link Datum|`Datum`} or {@link NodeInputInfo|`NodeInputInfo`} linked to the connector that received the {@link MouseEvent|`MouseEvent`}.
     * @param {boolean} rightFacing - If `true`, the connector is an {@link ElaborationNode#outputs|`output`}, if `false` it is an {@link ElaborationNode#inputs|`input`}.
     * @param {MouseEvent} event - The DOM event.
     */
    public nodeConnectorMouseDown(node: ElaborationNode, datum: Datum | NodeInputInfo, rightFacing: boolean, event: MouseEvent): void {
        if (datum instanceof Datum) {
            this.connectorMouseDown({node, datum, external: false, rightFacing}, event, null);
        } else {
            this.connectorMouseDown({node, datum: datum.datum, external: false, rightFacing, specialAdditional: datum.specialInputAddMore}, event, null);
        }
    }

    /**
     * Elaborate the mousedown event on a {@link MixUiManager#mix|`mix`}'s {@link Mix#imports|`import`}'s connector.
     *
     * @param {ExportedDatum} datum - The {@link MixUiManager#mix|`mix`}'s {@link Mix#imports|`import`} linked to the connector that received the {@link MouseEvent|`MouseEvent`}.
     * @param {MouseEvent} event - The DOM event.
     */
    public externalConnectorRightFacingMouseDown(datum: ExportedDatum, event: MouseEvent): void {
        this.connectorMouseDown({datum, external: true, rightFacing: true}, event, null);
    }

    /**
     * Elaborate the mousedown event on a {@link MixUiManager#mix|`mix`}'s {@link Mix#outputs|`output`}'s connector.
     *
     * @param {Datum} datum - The {@link MixUiManager#mix|`mix`}'s {@link Mix#outputs|`output`} linked to the connector that received the {@link MouseEvent|`MouseEvent`}.
     * @param {MouseEvent} event - The DOM event.
     */
    public externalConnectorLeftFacingMouseDown(datum: Datum, event: MouseEvent): void {
        this.connectorMouseDown({datum, external: true, rightFacing: false}, event, null);
    }

    /**
     * Elaborate the mousedown event on a connector.
     *
     * @param {ConnectorInfo} connector - Information about the connector that received the {@link MouseEvent|`MouseEvent`}.
     * @param {MouseEvent} event - The DOM event.
     * @param {Connection | null} replacingConnection - If the connector already had a {@link Connection|`Connection`} to it that is being replaced, this is it.
     */
    private connectorMouseDown(connector:
                               ConnectorInfo,
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
                    connection:       {from, to: {...from}},
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
                    connection:       {from, to: {...from}},
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
                    newDragging.connection.to = {...to};

                    newDragging.startDrag.x -= to.x - newDragging.connection.from.x;
                    newDragging.startDrag.y -= to.y - newDragging.connection.from.y;

                    newDragging.replacingConnection = replacingConnection;

                    newDragging.snapPosition = {...newDragging.connection.to};
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
                        connection:       {from: {...to}, to},
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
                        connection:       {from: {...to}, to},
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

                        newDragging.connection.from = {...from};

                        newDragging.startDrag.x -= from.x - newDragging.connection.to.x;
                        newDragging.startDrag.y -= from.y - newDragging.connection.to.y;

                        newDragging.replacingConnection = replacingConnection;
                        newDragging.candidatePartner    = {external: false, node: sourceNode, datum: sourceDatum, input: false};
                        newDragging.snapPosition        = {...newDragging.connection.from};
                    }
                }

                if (replacingConnection != null) {
                    newDragging.replacingConnection = replacingConnection;
                }

                this.currentDragging = newDragging;
            }
        }
    }

    /**
     * Elaborate a mousemove event on {@link ElaborationNode|`ElaborationNode`}'s connector.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} containing the connector that received the {@link MouseEvent|`MouseEvent`}.
     * @param {Datum | NodeInputInfo} connector - The {@link Datum|`Datum`} or {@link NodeInputInfo|`NodeInputInfo`} linked to the connector that received the
     *        {@link MouseEvent|`MouseEvent`}.
     * @param {boolean} rightFacing - If `true`, the connector is an {@link ElaborationNode#outputs|`output`}, if `false` it is an {@link ElaborationNode#inputs|`input`}.
     */
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


    /**
     * Elaborate a mousemove event on a {@link MixUiManager#mix|`mix`}'s {@link Mix#imports|`import`}'s connector.
     *
     * @param {ExportedDatum} connector - The {@link MixUiManager#mix|`mix`}'s {@link Mix#imports|`import`} linked to the connector that received the {@link MouseEvent|`MouseEvent`}.
     */
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

    /**
     * Elaborate a mousemove event on a {@link MixUiManager#mix|`mix`}'s {@link Mix#outputs|`output`}'s connector.
     *
     * @param {Datum} connector - The {@link MixUiManager#mix|`mix`}'s {@link Mix#outputs|`output`} linked to the connector that received the {@link MouseEvent|`MouseEvent`}.
     */
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

    /**
     * Elaborate a mousemove event on a {@link NodeGroup|`NodeGroup`}'s header.
     *
     * @param {NodeGroup} group - The {@link NodeGroup|`NodeGroup`} that received the {@link MouseEvent|`MouseEvent`} on its header.
     */
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

    /** Elaborate a mouseleave event on a {@link NodeGroup|`NodeGroup`}'s header. */
    public groupHeaderLeave(): void {
        if (this.currentDragging != null && (this.currentDragging.type == DraggingElementType.GROUP || this.currentDragging.type == DraggingElementType.NODE)) {
            this.currentDragging.moveToGroup  = undefined;
            this.currentDragging.snapPosition = undefined;
        }
    }

    /**
     * Elaborate a mousemove event on the whole SVG canvas, according to what the current dragging status is.
     *
     * @param {MouseEvent} event - The DOM event.
     */
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
            this.translation.x = this.currentDragging.startTranslation.x + event.clientX - this.currentDragging.startDrag.x;
            this.translation.y = this.currentDragging.startTranslation.y + event.clientY - this.currentDragging.startDrag.y;
        } else if ((this.currentDragging.type == DraggingElementType.LINK_FROM_NODE_OUTPUT) || (this.currentDragging.type == DraggingElementType.LINK_FROM_EXTERNAL_INPUT)) {
            this.currentDragging.connection.to.x = this.currentDragging.connection.from.x + pointerPosition.x - this.currentDragging.startDrag.x;
            this.currentDragging.connection.to.y = this.currentDragging.connection.from.y + pointerPosition.y - this.currentDragging.startDrag.y;

            if (this.currentDragging.snapPosition) {
                const dx       = this.currentDragging.connection.to.x - this.currentDragging.snapPosition.x;
                const dy       = this.currentDragging.connection.to.y - this.currentDragging.snapPosition.y;
                const distance = dx * dx + dy * dy;
                if (distance > MEASURES.CONNECTOR_SNAP_RADIUS_SQUARED) {
                    this.currentDragging.snapPosition     = null;
                    this.currentDragging.candidatePartner = null;
                }
            }
        } else { // LINK_TO_NODE_INPUT or LINK_TO_EXTERNAL_OUTPUT
            this.currentDragging.connection.from.x = this.currentDragging.connection.to.x + pointerPosition.x - this.currentDragging.startDrag.x;
            this.currentDragging.connection.from.y = this.currentDragging.connection.to.y + pointerPosition.y - this.currentDragging.startDrag.y;

            if (this.currentDragging.snapPosition) {
                const dx       = this.currentDragging.connection.from.x - this.currentDragging.snapPosition.x;
                const dy       = this.currentDragging.connection.from.y - this.currentDragging.snapPosition.y;
                const distance = dx * dx + dy * dy;
                if (distance > MEASURES.CONNECTOR_SNAP_RADIUS_SQUARED) {
                    this.currentDragging.snapPosition     = null;
                    this.currentDragging.candidatePartner = null;
                }
            }
        }
    }

    /** Elaborate a mouseup event on the whole SVG canvas, and elaborate the end of the current drag procedure. */
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
                                    drainNodeInputName:   drainNodeInputName
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
                                drainNodeInputName:   drainNodeInputName
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

    /**
     * Elaborate a mousewheel event on the whole SVG canvas, and adjust zoom accordingly.
     *
     * @param {WheelEvent} wheelEvent - The DOM event.
     */
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

    /**
     * Register a callback to be called whenever some elaboration by this class has changed the status of the {@link MixUiManager#mix|`mix`} or its {@link MixLayout|`MixLayout`}.
     *
     * @param {() => void} callback - The callback to register.
     */
    public addChangeCallback(callback: () => void): void {
        this.changeCallbacks.push(callback);
    }

    /**
     * Remove a callback previously registered with {@link MixUiManager#addChangeCallback| `addChangeCallback()`}.
     *
     * @param {() => void} callback - The callback to remove.
     */
    public removeChangeCallback(callback: () => void): void {
        this.changeCallbacks = this.changeCallbacks.filter(a => a != callback);
    }

    /** Call the callbacks previously registered with {@link MixUiManager#addChangeCallback| `addChangeCallback()`}. Call this function every time some elaboration by this class has changed the status of the {@link MixUiManager#mix|`mix`} or its {@link MixLayout|`MixLayout`}. */
    private emitChanges(): void {
        this.changeCallbacks.forEach(callback => {
            callback();
        });
    }

    /**
     * Export the current layout status of the {@link MixUiManager#mix|`mix`} as a {@link MixLayout|`MixLayout`}.
     *
     * @returns {MixLayout} The current layout status of the {@link MixUiManager#mix|`mix`} as a {@link MixLayout|`MixLayout`}.
     * @see {@link MixUiManager#importLayout| `importLayout()`}.
     */
    public exportLayout(): MixLayout {
        return new MixLayout(
            recordFromEntries([...this.nodePositions.entries()].map(entry => [entry[0].id, entry[1]])),
            this.allGroups.map(group => group.toJSON(this.allGroups))
        );
    }

    /**
     * Restore the layout status of the {@link MixUiManager#mix|`mix`} from a {@link MixLayout|`MixLayout`}.
     *
     * @param {MixLayout} layout - The {@link MixLayout|`MixLayout`} to restore.
     * @see {@link MixUiManager#exportLayout| `exportLayout()`}.
     */
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
                group.updateExports(mix.connections);
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

    /**
     * Create a new {@link NodeGroup|`NodeGroup`} containing some {@link ElaborationNode|`ElaborationNode`s} or other {@link NodeGroup|`NodeGroup`s}.
     *
     * @param {(ElaborationNode | NodeGroup)[]} newGroupElements - The {@link ElaborationNode|`ElaborationNode`s} or other {@link NodeGroup|`NodeGroup`s}
     *                                                             to add to the new {@link NodeGroup|`NodeGroup`} as children.
     */
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

    /**
     * Move some {@link ElaborationNode|`ElaborationNode`s} or {@link NodeGroup|`NodeGroup`s} to another {@link NodeGroup|`NodeGroup`}, removing them from
     * the current {@link NodeGroup|`NodeGroup`}, if any.
     *
     * @param {ElaborationNode | NodeGroup} element - The {@link ElaborationNode|`ElaborationNode`} or {@link NodeGroup|`NodeGroup`} to move.
     * @param {NodeGroup} toGroup - The destination {@link NodeGroup|`NodeGroup`}.
     */
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
                const stacks      = Math.max(this.getNodeInputCount(element), element.outputs.length);
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

    /**
     * Delete a {@link NodeGroup|`NodeGroup`} removing it from the {@link MixUiManager#mix|`mix`} and putting all of its descendant into its parent {@link NodeGroup|`NodeGroup`},
     * if the group has one. Otherwise, {@link NodeGroup#subGroups|`subGroups`} are put in the root.
     *
     * @param {NodeGroup} group - The {@link NodeGroup|`NodeGroup`} to delete.
     */
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

    /**
     * Remove some {@link ElaborationNode|`ElaborationNode`s} or {@link NodeGroup|`NodeGroup`s} from their containing {@link NodeGroup|`NodeGroup`}.
     * The removed elements are put in the next {@link NodeGroup|`NodeGroup`} up or in the root if no such {@link NodeGroup|`NodeGroup`} exists.
     *
     * @param {(ElaborationNode | NodeGroup)[]} elements - The {@link ElaborationNode|`ElaborationNode`s} or {@link NodeGroup|`NodeGroup`s} to remove from their parent
     *     {@link NodeGroup|`NodeGroup`}.
     */
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

    /**
     * Checks whether a set of {@link ElaborationNode|`ElaborationNode`s} or {@link NodeGroup|`NodeGroup`s} can be put
     * together in a group, or if their location prevents them from doing it. This is equivalent to check whether
     * all the elements are direct siblings.
     *
     * @param {(ElaborationNode | NodeGroup)[]} newGroupElements - The {@link ElaborationNode|`ElaborationNode`s} or {@link NodeGroup|`NodeGroup`s} to attempt to group.
     * @returns {boolean} Whether `newGroupElements` can be grouped together.
     */
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
            // We don't care if the answer is no or unknown, if we haven't found out by now the answer is no
            return result === true;
        }
        return false;
    }

    /** Scan the whole {@link MixUiManager#mix|`mix`} layout to recalculate all the {@link ElaborationNode|`ElaborationNode`s} or {@link NodeGroup|`NodeGroup`s} that are not visible because children of a collapsed {@link NodeGroup|`NodeGroup`}. */
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

    /**
     * Toggle the visibility of a {@link NodeGroup|`NodeGroup`}'s descendants (its {@link NodeGroup#collapsed|`collapsed`} status).
     *
     * @param {NodeGroup} group - The {@link NodeGroup|`NodeGroup`} to toggle the {@link NodeGroup#collapsed|`collapsed`} status of.
     */
    public toggleCollapsedGroup(group: NodeGroup): void {
        group.collapsed = !group.collapsed;
        this.calculateVisibleElements();
        if (this._mix != null) {
            group.updateExports(this._mix.connections);
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


    /**
     * Change the order of a {@link NodeGroup|`NodeGroup`}'s {@link NodeGroup#inputs|`input`} or {@link NodeGroup#outputs|`output`}.
     *
     * @param {NodeGroup} group - The {@link NodeGroup|`NodeGroup`} containing the export to move.
     * @param {Datum} datum - The {@link Datum|`Datum`} to move.
     * @param {number} nodeId - The {@link ElaborationNode#id|`id`} of the {@link ElaborationNode|`ElaborationNode`} the export belongs to.
     * @param {boolean} forwards - If `true`, the export will be shifted one position forwards in the list,
     *                             if `false` it will be shifted one position backwards.
     * @param {boolean} isInput - Whether the export is an {@link NodeGroup#inputs|`input`} or {@link NodeGroup#outputs|`output`}.
     */
    public moveGroupExport(group: NodeGroup, datum: Datum, nodeId: number, forwards: boolean, isInput: boolean): void {
        group.moveExport(datum, nodeId, forwards, isInput);
        if (this._mix != null) {
            for (const connection of this._mix.connections) {
                this.updateConnection(connection);
            }
            this.emitChanges();
        }
    }

    /**
     * Toggle the single connectors visibility in a {@link NodeGroup|`NodeGroup`} (its {@link NodeGroup#showConnectors|`showConnectors`} status).
     *
     * @param {NodeGroup} group - The {@link NodeGroup|`NodeGroup`} to toggle the {@link NodeGroup#showConnectors|`showConnectors`} status to.
     */
    public toggleShowConnectorsGroup(group: NodeGroup): void {
        group.showConnectors = !group.showConnectors;
        this.calculateVisibleElements();
        this.recalculateMaxX();
        if (this._mix != null) {
            group.updateExports(this._mix.connections);
            for (const connection of this._mix.connections) {
                this.updateConnection(connection);
            }
            for (const firstLevelGroup of this.firstLevelGroups) {
                this.recalculateGroupBounds(firstLevelGroup);
            }
        }
        this.emitChanges();
    }

    /**
     * Recalculate a {@link NodeGroup|`NodeGroup`}'s bounds from the position of its children.
     *
     * @param {NodeGroup} group - The {@link NodeGroup|`NodeGroup`} to recalculate the bounds of.
     * @returns {Rect} The new bounds of the {@link NodeGroup|`NodeGroup`}.
     */
    private recalculateGroupBounds(group: NodeGroup): Rect {
        const positions: Rect[] = group.nodes
                                       .map(node => {
                                           const stacks = Math.max(this.getNodeInputCount(node), node.outputs.length);
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

/**
 * A rectangular area in 2D.
 *
 * @notExported
 */
interface Rect {
    /** The x coordinate of the left side of the rectangle. */
    x: number;
    /** The y coordinate of the top side of the rectangle. */
    y: number;
    /** The width of the rectangle. */
    width: number;
    /** The height of the rectangle. */
    height: number;
}

/**
 * The type of dragging being performed.
 *
 * @notExported
 */
enum DraggingElementType {
    /** Nothing is being dragged. */
    NODE,
    /** A {@link NodeGroup|`NodeGroup`} is being dragged. */
    GROUP,
    /** The background is being dragged to translate the whole canvas. */
    BACKGROUND,
    /** A {@link Connection|`Connection`} is being dragged starting from an {@link ElaborationNode|`ElaborationNode`}'s {@link ElaborationNode#outputs|`output`}. */
    LINK_FROM_NODE_OUTPUT,
    /** A {@link Connection|`Connection`} is being dragged starting from a {@link Mix|`Mix`}'s {@link Mix#inputs|`input`}. */
    LINK_FROM_EXTERNAL_INPUT,
    /** A {@link Connection|`Connection`} is being dragged to an {@link ElaborationNode|`ElaborationNode`}'s {@link ElaborationNode#inputs|`input`}. */
    LINK_TO_NODE_INPUT,
    /** A {@link Connection|`Connection`} is being dragged to a {@link Mix|`Mix`}'s {@link Mix#outputs|`output`}. */
    LINK_TO_EXTERNAL_OUTPUT
}


/**
 * While dragging a new {@link Connection|`Connection`}, this class describes the {@link ElaborationNode|`ElaborationNode`}'s
 * {@link ElaborationNode#outputs|`output`} that is currently hovered over and would be selected as the destination of the
 * {@link Connection|`Connection`} if the dragging were to be stopped.
 *
 * @notExported
 */
interface CandidateNodeOutput {
    /** This candidate is relative to an {@link ElaborationNode|`ElaborationNode`}. */
    external: false;
    /** The {@link ElaborationNode|`ElaborationNode`} the {@link ElaborationNode#outputs|`output`} belongs to. */
    node: ElaborationNode,
    /** The candidate {@link ElaborationNode#outputs|`output`}. */
    datum: Datum,
    /** This candidate is an {@link ElaborationNode#outputs|`output`}. */
    input: false;
}

/**
 * While dragging a new {@link Connection|`Connection`}, this class describes the {@link ElaborationNode|`ElaborationNode`}'s
 * {@link ElaborationNode#inputs|`input`} that is currently hovered over and would be selected as the source of the
 * {@link Connection|`Connection`} if the dragging were to be stopped.
 *
 * @notExported
 */
interface CandidateNodeInput {
    /** This candidate is relative to an {@link ElaborationNode|`ElaborationNode`}. */
    external: false;
    /** The {@link ElaborationNode|`ElaborationNode`} the {@link ElaborationNode#inputs|`input`} belongs to. */
    node: ElaborationNode;
    /** The candidate {@link ElaborationNode#inputs|`input`}. */
    datum: Datum;
    /** This candidate is an {@link ElaborationNode#inputs|`input`}. */
    input: true;
    /** Whether the input is an additional one for an {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`}. */
    isArbitrary?: boolean;
}

/**
 * While dragging a new {@link Connection|`Connection`}, this class describes the {@link Mix|`Mix`}'s
 * {@link Mix#imports|`import`} that is currently hovered over and would be selected as the source of the
 * {@link Connection|`Connection`} if the dragging were to be stopped.
 *
 * @notExported
 */
interface CandidateExternalInput {
    /** This candidate is relative to a {@link Mix|`Mix`}'s outside connection. */
    external: true;
    /** The candidate {@link Mix#imports|`import`}. */
    datum: ExportedDatum;
    /** This candidate is an {@link ExportedDatum|`import`}. */
    input: true;
}

/**
 * While dragging a new {@link Connection|`Connection`}, this class describes the {@link Mix|`Mix`}'s
 * {@link Mix#outputs|`output`} that is currently hovered over and would be selected as the destination of the
 * {@link Connection|`Connection`} if the dragging were to be stopped.
 *
 * @notExported
 */
interface CandidateExternalOutput {
    /** This candidate is relative to a {@link Mix|`Mix`}'s outside connection. */
    external: true;
    /** The candidate {@link Mix#outputs|`output`}. */
    datum: Datum;
    /** This candidate is an output. */
    input: false;
}

/**
 * While dragging an {@link ElaborationNode|`ElaborationNode`}, this class describes all the parameters
 * and information about the dragging.
 *
 * @notExported
 */
interface DraggingNode {
    /** An {@link ElaborationNode|`ElaborationNode`} is being dragged. */
    type: DraggingElementType.NODE,
    /** Whether the dragging has already moved the {@link ElaborationNode|`ElaborationNode`}. */
    hasMoved: boolean,
    /** The {@link ElaborationNode|`ElaborationNode`} being dragged. */
    node: ElaborationNode,
    /** The coordinates the {@link ElaborationNode|`ElaborationNode`} started being dragged from. */
    startPosition: Point,
    /** The coordinates of the mouse when the dragging began. */
    startDrag: Point,
    /** If the dragging is over a {@link NodeGroup|`NodeGroup`}'s header, this is the {@link NodeGroup|`NodeGroup`}, `undefined` otherwise. */
    moveToGroup?: NodeGroup,
    /** If the dragging is over a {@link NodeGroup|`NodeGroup`}'s header, this is the position to snap the {@link ElaborationNode|`ElaborationNode`} to, `undefined` otherwise. */
    snapPosition?: Point
}

/**
 * While dragging a {@link NodeGroup|`NodeGroup`}, this class describes all the parameters
 * and information about the dragging.
 *
 * @notExported
 */
interface DraggingGroup {
    /** A {@link NodeGroup|`NodeGroup`} is being dragged. */
    type: DraggingElementType.GROUP,
    /** Whether the dragging has already moved the {@link NodeGroup|`NodeGroup`}. */
    hasMoved: boolean,
    /** The {@link NodeGroup|`NodeGroup`} being dragged. */
    group: NodeGroup,
    /** The coordinates the {@link NodeGroup|`NodeGroup`} started being dragged from. */
    startPosition: Point,
    /** The coordinates of every {@link ElaborationNode|`ElaborationNode`} descending from the {@link NodeGroup|`NodeGroup`} when the dragging began. */
    nodeStartPositions: Point[],
    /** The coordinates of the mouse when the dragging began. */
    startDrag: Point,
    /** If the dragging is over a {@link NodeGroup|`NodeGroup`}'s header, this is the {@link NodeGroup|`NodeGroup`}, `undefined` otherwise. */
    moveToGroup?: NodeGroup
    /** If the dragging is over a {@link NodeGroup|`NodeGroup`}'s header, this is the position to snap the dragged {@link NodeGroup|`NodeGroup`} to, `undefined` otherwise. */
    snapPosition?: Point
}

/**
 * While dragging the background, this class describes all the parameters
 * and information about the dragging.
 *
 * @notExported
 */
interface DraggingBackground {
    /** The background is being dragged. */
    type: DraggingElementType.BACKGROUND,
    /** The coordinates of the mouse when the dragging began. */
    startDrag: Point
    /** The initial translation of the canvas when the dragging began. */
    startTranslation: Point,
}

/**
 * While dragging a new {@link Connection|`Connection`} starting from an {@link ElaborationNode|`ElaborationNode`}'s {@link ElaborationNode#outputs|`output`},
 * this class describes all the parameters and information about the dragging.
 *
 * @notExported
 */
interface DraggingFromNodeOutput {
    /** A {@link Connection|`Connection`} is being dragged from an {@link ElaborationNode|`ElaborationNode`}'s {@link ElaborationNode#outputs|`output`}. */
    type: DraggingElementType.LINK_FROM_NODE_OUTPUT;
    /** The {@link ElaborationNode|`ElaborationNode`} the dragging started from. */
    node: ElaborationNode;
    /** The name of the {@link ElaborationNode#outputs|`output`} the dragging started from. */
    outputName: string;
    /** The current coordinates of the {@link Connection|`Connection`} being dragged. */
    connection: Line;
    /** The coordinates of the mouse when the dragging began. */
    startDrag: Point;
    /** The coordinates to snap the end of the {@link Connection|`Connection`} to if hovering over a compatible connector, `null` otherwise. */
    snapPosition: Point | null;
    /** If the dragging is replacing an existing {@link Connection|`Connection`}, this is it. */
    replacingConnection?: Connection;
    /** The connector currently hovered over that would be the destination if released. */
    candidatePartner: CandidateNodeInput | CandidateExternalOutput | null;
    /** Information about the data type of the source connector. */
    datumInfo: DatumInfo;
}

/**
 * While dragging a new {@link Connection|`Connection`} starting from a {@link Mix|`Mix`}'s {@link Mix#imports|`import`},
 * this class describes all the parameters and information about the dragging.
 *
 * @notExported
 */
interface DraggingFromExternalInput {
    /** A {@link Connection|`Connection`} is being dragged from an external input. */
    type: DraggingElementType.LINK_FROM_EXTERNAL_INPUT;
    /** The name of the {@link Mix#imports|`import`} the dragging started from. */
    inputName: string,
    /** The current coordinates of the {@link Connection|`Connection`} being dragged. */
    connection: Line;
    /** The coordinates of the mouse when the dragging began. */
    startDrag: Point;
    /** The coordinates to snap the end of the {@link Connection|`Connection`} to if hovering over a compatible connector, `null` otherwise. */
    snapPosition: Point | null;
    /** If the dragging is replacing an existing {@link Connection|`Connection`}, this is it. */
    replacingConnection?: Connection;
    /** The connector currently hovered over that would be the destination if released. */
    candidatePartner: CandidateNodeInput | CandidateExternalOutput | null;
    /** Information about the data type of the source connector. */
    datumInfo: DatumInfo;
}

/**
 * While dragging a new {@link Connection|`Connection`} towards an {@link ElaborationNode|`ElaborationNode`}'s {@link ElaborationNode#inputs|`input`},
 * this class describes all the parameters and information about the dragging.
 *
 * @notExported
 */
interface DraggingToNodeInput {
    /** A {@link Connection|`Connection`} is being dragged to a node input. */
    type: DraggingElementType.LINK_TO_NODE_INPUT;
    /** The {@link ElaborationNode|`ElaborationNode`} the dragging is targeting. */
    node: ElaborationNode;
    /** The name of the {@link ElaborationNode#inputs|`input`} the dragging is targeting. */
    inputName: string;
    /** The current coordinates of the {@link Connection|`Connection`} being dragged. */
    connection: Line;
    /** The coordinates of the mouse when the dragging began. */
    startDrag: Point;
    /** The coordinates to snap the start of the {@link Connection|`Connection`} to, if hovering over a compatible connector, `null` otherwise. */
    snapPosition: Point | null;
    /** If the dragging is replacing an existing {@link Connection|`Connection`}, this is it. */
    replacingConnection?: Connection;
    /** The connector currently hovered over that would be the source if released. */
    candidatePartner: CandidateNodeOutput | CandidateExternalInput | null;
    /** Information about the data type of the target connector. */
    datumInfo: DatumInfo;
    /** Whether the target is the additional input add connector of an {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`}. */
    isAdditional?: boolean;
}

/**
 * While dragging a new {@link Connection|`Connection`} towards a {@link Mix|`Mix`}'s {@link Mix#outputs|`output`},
 * this class describes all the parameters and information about the dragging.
 *
 * @notExported
 */
interface DraggingToExternalOutput {
    /** A {@link Connection|`Connection`} is being dragged to an external output. */
    type: DraggingElementType.LINK_TO_EXTERNAL_OUTPUT;
    /** The name of the {@link Mix#outputs|`output`} the dragging is targeting. */
    outputName: string;
    /** The current coordinates of the {@link Connection|`Connection`} being dragged. */
    connection: Line;
    /** The coordinates of the mouse when the dragging began. */
    startDrag: Point;
    /** The coordinates to snap the start of the {@link Connection|`Connection`} to if hovering over a compatible connector, `null` otherwise. */
    snapPosition: Point | null;
    /** If the dragging is replacing an existing {@link Connection|`Connection`}, this is it. */
    replacingConnection?: Connection;
    /** The connector currently hovered over that would be the source if released. */
    candidatePartner: CandidateNodeOutput | CandidateExternalInput | null;
    /** Information about the data type of the target connector. */
    datumInfo: DatumInfo;
}

/**
 * When dragging, this is the object containing the information and parameters about the dragging.
 *
 * @notExported
 */
type DraggingElement = DraggingNode | DraggingGroup | DraggingBackground | DraggingFromNodeOutput | DraggingToNodeInput | DraggingFromExternalInput | DraggingToExternalOutput;

/**
 * A collection of {@link ElaborationNode|`ElaborationNode`s} and other {@link NodeGroup|`NodeGroup`s} that move together.
 * The group can have a name can be collapsed, join connectors, and reduce visual complexity.
 */
export class NodeGroup {

    /** The name shown in the UI. */
    public name: string = 'Group';

    /** The {@link ElaborationNode|`ElaborationNode`s} that are direct children of this {@link NodeGroup|`NodeGroup`}. */
    public nodes: ElaborationNode[] = [];

    /** The {@link NodeGroup|`NodeGroup`s} that are direct children of this {@link NodeGroup|`NodeGroup`}. */
    public subGroups: NodeGroup[] = [];

    /** Whether this {@link NodeGroup|`NodeGroup`} should be shown in the UI as collapsed. A collapsed group hides its descendants, and groups all its descendants' inputs and outputs together. */
    public collapsed: boolean      = false;
    /** Whether this  {@link NodeGroup|`NodeGroup`}'s {@link NodeGroup#inputs|`inputs`} and {@link NodeGroup#outputs|`outputs`} should be shown in the UI singularly or grouped together in a big connector.*/
    public showConnectors: boolean = true;

    /** All the descendants' inputs that go outside the {@link NodeGroup|`NodeGroup`}. */
    public inputs: { datum: Datum, nodeId: number }[]  = [];
    /** All the descendants' outputs that go inside the {@link NodeGroup|`NodeGroup`}. */
    public outputs: { datum: Datum, nodeId: number }[] = [];

    /** Aliases for the descendants' inputs to be shown instead of their actual {@link Datum#name|`Datum.name`}. */
    public inputAliases: { datumName: string, nodeId: number, alias: string }[]  = [];
    /** Aliases for the descendants' outputs to be shown instead of their actual {@link Datum#name|`Datum.name`}. */
    public outputAliases: { datumName: string, nodeId: number, alias: string }[] = [];

    /** The order to show the {@link NodeGroup#inputs|`inputs`} in. */
    public inputPositions: { datumName: string, nodeId: number, order: number }[]  = [];
    /** The order to show the {@link NodeGroup#outputs|`outputs`} in. */
    public outputPositions: { datumName: string, nodeId: number, order: number }[] = [];

    /** If this {@link NodeGroup|`NodeGroup`} is inside another {@link NodeGroup|`NodeGroup`}, this is the nearest ancestor {@link NodeGroup|`NodeGroup`}. */
    public parent: NodeGroup | null = null;
    /** The depth in the {@link NodeGroup|`NodeGroup`} hierarchy. */
    private _level: number          = 0;

    /** The {@link NodeGroup|`NodeGroup`}'s leftmost bound. */
    public x: number      = 0;
    /** The {@link NodeGroup|`NodeGroup`}'s topmost bound. */
    public y: number      = 0;
    /** The {@link NodeGroup|`NodeGroup`}'s width. */
    public width: number  = 0;
    /** The {@link NodeGroup|`NodeGroup`}'s height. */
    public height: number = 0;

    /** The depth in the {@link NodeGroup|`NodeGroup`} hierarchy. */
    public get level(): number {
        return this._level;
    }

    /** Set the depth in the {@link NodeGroup|`NodeGroup`} hierarchy, and propagate it to all the descending groups. */
    public set level(level: number) {
        this.subGroups.forEach(group => {group.level = level + 1;});
        this._level = level;
    }

    /**
     * Whether this {@link NodeGroup|`NodeGroup`} contains a {@link ElaborationNode|`ElaborationNode`}, both as its child or as a far descendant.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} to check.
     * @returns {boolean} Whether this {@link NodeGroup|`NodeGroup`} contains a {@link ElaborationNode|`ElaborationNode`}.
     */
    public containsNode(node: ElaborationNode): boolean {
        return this.nodes.includes(node) || this.subGroups.some(subGroup => subGroup.containsNode(node));
    }

    /**
     * Whether this {@link NodeGroup|`NodeGroup`} contains another {@link NodeGroup|`NodeGroup`}, both as its child or as a far descendant.
     *
     * @param {ElaborationNode} group - The {@link ElaborationNode|`ElaborationNode`} to check.
     * @returns {boolean} Whether this {@link NodeGroup|`NodeGroup`} contains a {@link ElaborationNode|`ElaborationNode`}.
     */
    public containsGroup(group: NodeGroup): boolean {
        return this.subGroups.includes(group) || this.subGroups.some(subGroup => subGroup.containsGroup(group));
    }

    /**
     * Checks whether some {@link ElaborationNode|`ElaborationNode`s} or {@link NodeGroup|`NodeGroup`} are all direct children of the same {@link NodeGroup|`NodeGroup`}.
     *
     * @param {(ElaborationNode | NodeGroup)[]} elements - The elements to check.
     * @returns {boolean | null} - - `true` if the elements are found to be siblings, either if all direct children of this {@link NodeGroup|`NodeGroup`s} or of a child
     *     {@link NodeGroup|`NodeGroup`s},
     *                             - `false` if the elements are definitely not siblings, because they are children of different {@link NodeGroup|`NodeGroup`s},
     *                             - `null` if it was not possible to determine if the elements are siblings, because they are not found in the descending hierarchy, and thus may or may not
     *     be siblings elsewhere.
     */
    public elementsAreSiblings(elements: (ElaborationNode | NodeGroup)[]): boolean | null {
        return NodeGroup.checkElementsAreSiblings(elements, this.nodes, this.subGroups);
    }

    /** All the {@link ElaborationNode|`ElaborationNode`s} descending from this {@link NodeGroup|`NodeGroup`}, direct children or descendant of a child {@link NodeGroup|`NodeGroup`}. */
    public get allNodes(): ElaborationNode[] {
        return this.nodes.concat(...this.subGroups.flatMap(subGroup => subGroup.allNodes));
    }

    /** All the {@link NodeGroup|`NodeGroup`s} descending from this {@link NodeGroup|`NodeGroup`}, direct children or descendant of a child {@link NodeGroup|`NodeGroup`}. */
    public get allGroups(): NodeGroup[] {
        return this.subGroups.concat(...this.subGroups.flatMap(subGroup => subGroup.allGroups));
    }

    /** All of the {@link ElaborationNode|`ElaborationNode`s} in {@link NodeGroup#allNodes| `allNodes()`} that are descendant of a {@link NodeGroup#collapsed|`collapsed`} {@link NodeGroup|`NodeGroup`}. */
    public get collapsedNodes(): ElaborationNode[] {
        if (this.collapsed) {
            return this.allNodes;
        } else {
            return this.subGroups.flatMap(group => group.collapsedNodes);
        }
    }

    /** All of the {@link NodeGroup|`NodeGroup`s} in {@link NodeGroup#allGroups| `allGroups()`} that are descendant of a {@link NodeGroup#collapsed|`collapsed`} {@link NodeGroup|`NodeGroup`}. */
    public get collapsedGroups(): NodeGroup[] {
        if (this.collapsed) {
            return this.allGroups;
        } else {
            return this.subGroups.flatMap(group => group.collapsedGroups);
        }
    }

    /** Get the actual visible height of this {@link NodeGroup|`NodeGroup`}, considering its {@link NodeGroup#collapsed|`collapsed`} status. */
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

    /** Get the actual visible width of this {@link NodeGroup|`NodeGroup`}, considering its {@link NodeGroup#collapsed|`collapsed`} status. */
    public get displayWidth(): number {
        return this.collapsed ? MEASURES.NODE_WIDTH : this.width;
    }

    /** Get the actual visible left margin of this {@link NodeGroup|`NodeGroup`}, considering its {@link NodeGroup#collapsed|`collapsed`} status. */
    public get displayX(): number {
        return this.collapsed ? this.x + (this.width - MEASURES.NODE_WIDTH) / 2 : this.x;
    }

    /**
     * Update {@link NodeGroup#inputs|`this.inputs`} and {@link NodeGroup#outputs|`this.outputs`} according to all the {@link Connection|`Connection`} in a {@link Mix|`Mix`}.
     *
     * @param {readonly Connection[]} connections - The connections in the {@link Mix|`Mix`}.
     */
    public updateExports(connections: readonly Connection[]): void {
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
        let maxOrderInput  = Math.max(...this.inputPositions.map(position => position.order), 0);
        let maxOrderOutput = Math.max(...this.outputPositions.map(position => position.order), 0);
        for (const input of this.inputs) {
            if (!this.inputPositions.some(position => position.datumName == input.datum.name && position.nodeId == input.nodeId)) {
                this.inputPositions.push({
                                             datumName: input.datum.name,
                                             nodeId:    input.nodeId,
                                             order:     ++maxOrderInput
                                         });
            }
        }
        for (const output of this.outputs) {
            if (!this.outputPositions.some(position => position.datumName == output.datum.name && position.nodeId == output.nodeId)) {
                this.outputPositions.push({
                                              datumName: output.datum.name,
                                              nodeId:    output.nodeId,
                                              order:     ++maxOrderOutput
                                          });
            }
        }
        this.inputs.sort((a, b) => {
            const inputAPosition = this.inputPositions.find(position => position.datumName == a.datum.name && position.nodeId == a.nodeId)?.order ?? 0;
            const inputBPosition = this.inputPositions.find(position => position.datumName == b.datum.name && position.nodeId == b.nodeId)?.order ?? 0;
            return inputAPosition - inputBPosition;
        });
        this.outputs.sort((a, b) => {
            const outputAPosition = this.outputPositions.find(position => position.datumName == a.datum.name && position.nodeId == a.nodeId)?.order ?? 0;
            const outputBPosition = this.outputPositions.find(position => position.datumName == b.datum.name && position.nodeId == b.nodeId)?.order ?? 0;
            return outputAPosition - outputBPosition;
        });
        this.inputPositions  = this.inputs.map((input, index) => {
            return {
                datumName: input.datum.name,
                nodeId:    input.nodeId,
                order:     index
            };
        });
        this.outputPositions = this.outputs.map((output, index) => {
            return {
                datumName: output.datum.name,
                nodeId:    output.nodeId,
                order:     index
            };
        });
    }

    /**
     * Change the order of an {@link NodeGroup#inputs|`input`} or {@link NodeGroup#outputs|`output`}.
     *
     * @param {Datum} datum - The {@link Datum|`Datum`} that identifies the export to move.
     * @param {number} nodeId - The {@link ElaborationNode#id|`ElaborationNode.id`} containing the datum that identifies the export to move.
     * @param {boolean} forwards - Whether to move the export forwards or backwards by one spot.
     * @param {boolean} isInput - Whether the export is an {@link NodeGroup#inputs|`input`} or {@link NodeGroup#outputs|`output`}.
     */
    public moveExport(datum: Datum, nodeId: number, forwards: boolean, isInput: boolean): void {
        const positions = isInput ? this.inputPositions : this.outputPositions;
        const all       = isInput ? this.inputs : this.outputs;
        const oldIndex  = all.findIndex(other => other.datum.name == datum.name && other.nodeId == nodeId);
        if (oldIndex != -1) {
            const newIndex       = forwards ? oldIndex + 1 : oldIndex - 1;
            const swapOtherDatum = all[newIndex];
            const swapThisDatum  = all[oldIndex];
            if ((swapOtherDatum != null) && (swapThisDatum != null)) {
                const oldPosition =
                          positions.find(position =>
                                             position.datumName == datum.name && position.nodeId == nodeId);
                const newPosition =
                          positions
                              .find(position =>
                                        position.datumName == swapOtherDatum.datum.name && position.nodeId == swapOtherDatum.nodeId);
                if (oldPosition != null && newPosition != null) {
                    const temp        = oldPosition.order;
                    oldPosition.order = newPosition.order;
                    newPosition.order = temp;
                    all.splice(oldIndex, 1, swapOtherDatum);
                    all.splice(newIndex, 1, swapThisDatum);
                }
            }
        }
    }

    /**
     * Find the direct parent {@link NodeGroup|`NodeGroup`} for an {@link ElaborationNode|`ElaborationNode`} or a {@link NodeGroup|`NodeGroup`} in the descending hierarchy for
     * this {@link NodeGroup|`NodeGroup`}.
     *
     * @param {ElaborationNode | NodeGroup} element - The element to find the parent of.
     * @returns {NodeGroup | null} - The parent. `null` if no {@link NodeGroup|`NodeGroup`} in the descending hierarchy is the parent of the element.
     */
    public findParent(element: ElaborationNode | NodeGroup): NodeGroup | null {
        const result = NodeGroup.findParent(element, this.nodes, this.subGroups);
        if (result == 'ROOT') {
            return this;
        } else {
            return result;
        }
    }

    /**
     * Change the displayed aliased name of an {@link NodeGroup#inputs|`input`} or {@link NodeGroup#outputs|`output`}.
     *
     * @param {DatumNodeInfo} datum - The {@link Datum|`Datum`} and containing The {@link ElaborationNode#id|`ElaborationNode.id`} that identify the export to move.
     * @param {string} value - The new alias.
     * @param {boolean} isInput - Whether the export is an {@link NodeGroup#inputs|`input`} or {@link NodeGroup#outputs|`output`}.
     */
    public changeAlias(datum: DatumNodeInfo, value: string, isInput: boolean): void {
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

    /**
     * Get the displayed aliased name of an {@link NodeGroup#inputs|`input`} or {@link NodeGroup#outputs|`output`}.
     *
     * @param {DatumNodeInfo} datum - The {@link Datum|`Datum`} and containing The {@link ElaborationNode#id|`ElaborationNode.id`} that identify the export to move.
     * @param {boolean} isInput - Whether the export is an {@link NodeGroup#inputs|`input`} or {@link NodeGroup#outputs|`output`}.
     * @returns {string} The alias.
     */
    public getAlias(datum: DatumNodeInfo, isInput: boolean): string | null {
        const aliases = isInput ? this.inputAliases : this.outputAliases;
        return aliases
                   .find(alias =>
                             alias.datumName == datum.datum.name
                             && alias.nodeId == datum.nodeId)?.alias ?? null;
    }

    /**
     * Converts the node group instance into its JSON representation.
     *
     * @param {NodeGroup[]} allGroups - The list of all the {@link NodeGroup|`NodeGroup`s} in the {@link Mix|`Mix`}, used to extract the index to use as id.
     * @returns {NodeGroupJSON} The JSON representation of `this`.
     */
    public toJSON(allGroups: NodeGroup[]): NodeGroupJSON {
        return {
            name:            this.name,
            nodeIds:         this.nodes.map(node => node.id),
            subGroupIds:     this.subGroups.map(subGroup => allGroups.indexOf(subGroup)),
            collapsed:       this.collapsed,
            showConnectors:  this.showConnectors,
            inputAliases:    this.inputAliases,
            outputAliases:   this.outputAliases,
            inputPositions:  this.inputPositions,
            outputPositions: this.outputPositions,
            parentId:        this.parent != null ? allGroups.indexOf(this.parent) : null,
            level:           this.level
        };
    }

    /**
     * Update the references to {@link NodeGroup#subGroups|`subGroups`} and {@link NodeGroup#allGroups|`allGroups`} after all their deserializations
     * from JSON are available.
     *
     * @param {NodeGroupJSON} nodeGroupJSON - The JSON representation that was used to construct `this` with {@link NodeGroup.fromJSON| `fromJSON()`}.
     * @param {NodeGroup[]} allGroups - The deserialized {@link NodeGroup|`NodeGroup`s} to get the references from.
     */
    public fromJSONAdjust(nodeGroupJSON: NodeGroupJSON, allGroups: NodeGroup[]): void {
        this.subGroups = nodeGroupJSON.subGroupIds.map(subGroupId => allGroups[subGroupId]).filter(subGroup => subGroup != null);
        this.parent    = nodeGroupJSON.parentId != null ? allGroups[nodeGroupJSON.parentId] ?? null : null;
    }

    /**
     * Constructs a new {@link NodeGroup|`NodeGroup`} instance from a given JSON representation.
     *
     * @param {NodeGroupJSON} nodeGroupJSON - The JSON representation of the node group.
     * @param {readonly ElaborationNode[]} allNodes - All the {@link ElaborationNode|`ElaborationNode`s} in the {@link Mix|`Mix`}, to get the children from.
     * @returns {NodeGroup} The node group object constructed from the provided JSON.
     */
    public static fromJSON(nodeGroupJSON: NodeGroupJSON, allNodes: readonly ElaborationNode[]): NodeGroup {
        const result           = new NodeGroup();
        result.name            = nodeGroupJSON.name;
        result.nodes           = nodeGroupJSON
            .nodeIds
            .map(nodeId =>
                     allNodes
                         .find(node => node.id == nodeId))
            .filter(node => node != null);
        result.collapsed       = nodeGroupJSON.collapsed;
        result.showConnectors  = nodeGroupJSON.showConnectors;
        result.inputAliases    = nodeGroupJSON.inputAliases;
        result.outputAliases   = nodeGroupJSON.outputAliases;
        result._level          = nodeGroupJSON.level;
        result.inputPositions  = nodeGroupJSON.inputPositions;
        result.outputPositions = nodeGroupJSON.outputPositions;
        return result;
    }

    /**
     * Finds the parent of an {@link ElaborationNode|`ElaborationNode`} or a {@link NodeGroup|`NodeGroup`} in the descending hierarchy of a list of top-level {@link NodeGroup|`NodeGroup`s}.
     *
     * @param {ElaborationNode | NodeGroup} element - The element to find the parent of.
     * @param {ElaborationNode[]} rootNodes - The {@link ElaborationNode|`ElaborationNode`s} that don't have a parent.
     * @param {NodeGroup[]} rootGroups - The {@link NodeGroup|`NodeGroup`s} that don't have a parent.
     * @returns {NodeGroup | 'ROOT' | null} - The containing {@link NodeGroup|`NodeGroup`} if found, the literal `"ROOT"` if the element is doesn't have a parent or `null` if the
     *                                        element was not found in the descending hierarchy.
     */
    public static findParent(element: ElaborationNode | NodeGroup, rootNodes: ElaborationNode[], rootGroups: NodeGroup[]): NodeGroup | null | 'ROOT' {
        if (element instanceof ElaborationNode) {
            if (rootNodes.includes(element)) {
                return 'ROOT';
            }
        } else {
            if (rootGroups.includes(element)) {
                return 'ROOT';
            }
        }
        for (const subGroup of rootGroups) {
            const parent = subGroup.findParent(element);
            if (parent != null) {
                return parent;
            }
        }
        return null;
    }

    /**
     * Checks whether some {@link ElaborationNode|`ElaborationNode`s} or {@link NodeGroup|`NodeGroup`} are all direct children of the same {@link NodeGroup|`NodeGroup`}
     *  in the descending hierarchy of a list of top-level {@link NodeGroup|`NodeGroup`s}.
     *
     * @param {(ElaborationNode | NodeGroup)[]} elements - The elements to check.
     * @param {ElaborationNode[]} rootNodes - The {@link ElaborationNode|`ElaborationNode`s} that don't have a parent.
     * @param {NodeGroup[]} rootGroups - The {@link NodeGroup|`NodeGroup`s} that don't have a parent.
     * @returns {boolean | null} - - `true` if the elements are found to be siblings, either if all direct children of this {@link NodeGroup|`NodeGroup`s} or of a child
     *     {@link NodeGroup|`NodeGroup`s},
     *                             - `false` if the elements are definitely not siblings, because they are children of different {@link NodeGroup|`NodeGroup`s},
     *                             - `null` if it was not possible to determine if the elements are siblings, because they are not found in the descending hierarchy, and thus may or may not
     *     be siblings elsewhere.
     */
    public static checkElementsAreSiblings(elements: (ElaborationNode | NodeGroup)[], rootNodes: ElaborationNode[], rootGroups: NodeGroup[]): boolean | null {
        const areDirectChildren = elements.map(element => {
            if (element instanceof ElaborationNode) {
                return rootNodes.includes(element);
            } else {
                return rootGroups.includes(element);
            }
        });
        if (areDirectChildren.every(a => a)) {
            // If all elements are children of this, they are all siblings
            return true;
        } else if (areDirectChildren.every(a => !a)) {
            // If none of the elements are children of this, they may be siblings in the children groups
            if (rootGroups.length == 0) {
                // We don't have any subgroup, so we cannot say anything about them being siblings or not.
                return null;
            } else {
                for (const subGroup of rootGroups) {
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

/** Information about a {@link Datum|`Datum`} coming from a specific {@link ElaborationNode|`ElaborationNode`}. */
export interface DatumNodeInfo {
    /** The {@link Datum|`Datum`}. */
    datum: Datum;
    /** The {@link ElaborationNode#id|`id`} of the {@link ElaborationNode|`ElaborationNode`} containing the {@link Datum|`Datum`}. */
    nodeId: number
}

/**
 * The representation of an {@link ElaborationNode|`ElaborationNode`} as a node in the graph structure of a {@link Mix|`Mix`}'s calculation.
 */
interface TreeNode {
    /** The {@link ElaborationNode|`ElaborationNode`} this node is representing. */
    node: ElaborationNode;
    /** The {@link TreeNode|`TreeNode`s} relative to the  {@link ElaborationNode|`ElaborationNode`s} that are connected to this {@link ElaborationNode|`ElaborationNode`} through its {@link ElaborationNode#outputs|`outputs`}. */
    children: TreeNode[];
    /** The {@link TreeNode|`TreeNode`s} relative to the  {@link ElaborationNode|`ElaborationNode`s} that are connected to this {@link ElaborationNode|`ElaborationNode`} through its {@link ElaborationNode#inputs|`inputs`}. */
    parents: TreeNode[];
    /** The depth of this node from the {@link Mix|`Mix`}'s {@link Mix#inputs|`inputs`}. */
    level?: number;
}

/**
 * Information about a connector, i.e., any end of a {@link Connection|`Connection`}.
 *
 * @notExported
 */
type ConnectorInfo = {
    /** The {@link ElaborationNode|`ElaborationNode`} the connector is attached to. */
    node: ElaborationNode,
    /** The {@link Datum|`Datum`} this connector is representing. */
    datum: Datum,
    /** This connector is attached to an {@link ElaborationNode|`ElaborationNode`}. */
    external: false,
    /** The connector faces to the right. */
    rightFacing: true
} | {
    /** The {@link ElaborationNode|`ElaborationNode`} the connector is attached to. */
    node: ElaborationNode,
    /** The {@link Datum|`Datum`} this connector is representing. */
    datum: Datum,
    /** This connector is attached to an {@link ElaborationNode|`ElaborationNode`}. */
    external: false,
    /** The connector faces to the left. */
    rightFacing: false,
    /** Whether the connector is the "Add import" connector for an {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`}. */
    specialAdditional?: boolean
} | {
    /** The {@link ExportedDatum|`ExportedDatum`} this connector is representing. */
    datum: ExportedDatum,
    /** This connector is attached to a {@link Mix#imports|`Mix import`}. */
    external: true,
    /** The connector faces to the right. */
    rightFacing: true
} | {
    /** The {@link Datum|`Datum`} this connector is representing. */
    datum: Datum,
    /** This connector is attached to a {@link Mix#outputs|`Mix output`}. */
    external: true,
    /** The connector faces to the left. */
    rightFacing: false
};
