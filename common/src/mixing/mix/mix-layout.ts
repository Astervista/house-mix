import {Allow} from "rest-decorators";

export interface Point {
    x: number;
    y: number;
}

export class MixLayout {
    
    @Allow()
    public nodePositions: Record<string, Point>;
    
    constructor(
        nodePositions: Record<string, Point>
    ) {
        this.nodePositions = nodePositions;
    }
    
}
