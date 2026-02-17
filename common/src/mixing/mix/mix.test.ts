import {ConnectionDrainType, ConnectionSourceType, Mix} from "./mix";
import {DatumType} from "./datum";
import {ElaborationNodeCode} from "./elaboration-node";

describe("Composition", () => {
    test("Testing composition calculation", () => {
        const composition = Mix.fromJSON(
            {
                id:          1,
                inputs:      [
                    {
                        type: DatumType.NUMBER,
                        name: "discount",
                        nullable: false,
                    },
                    {
                        type: DatumType.NUMBER,
                        name: "costPerHour",
                        nullable: false,
                    },
                    {
                        type: DatumType.NUMBER,
                        name: "time",
                        nullable: false,
                    }
                ],
                outputs:     [
                    {
                        type: DatumType.NUMBER,
                        name: "pay",
                        nullable: false,
                    },
                    {
                        type: DatumType.NUMBER,
                        name: "time",
                        nullable: false,
                    },
                    {
                        type: DatumType.NUMBER,
                        name: "VAT",
                        nullable: false,
                    }
                ],
                imports: [],
                nodes:       [
                    {
                        id:   0,
                        code: ElaborationNodeCode.MULTIPLICATION
                    },
                    {
                        id:   1,
                        code: ElaborationNodeCode.MULTIPLICATION
                    },
                    {
                        id:   2,
                        code: ElaborationNodeCode.MULTIPLICATION
                    }
                ],
                connections: [
                    {
                        sourceType:      ConnectionSourceType.INPUT,
                        inputName:          "costPerHour",
                        drainType:      ConnectionDrainType.NODE,
                        drainNodeId:        1,
                        drainNodeInputName: "First number"
                    }, {
                        sourceType:      ConnectionSourceType.INPUT,
                        inputName:          "time",
                        drainType:      ConnectionDrainType.NODE,
                        drainNodeId:        1,
                        drainNodeInputName: "Second number"
                    }, {
                        sourceType:      ConnectionSourceType.INPUT,
                        inputName: "discount",
                        drainType:      ConnectionDrainType.NODE,
                        drainNodeId: 0,
                        drainNodeInputName: "First number"
                    },
                    {
                        sourceType:      ConnectionSourceType.NODE,
                        sourceNodeId: 1,
                        sourceNodeOutputName: "Product",
                        drainType:      ConnectionDrainType.NODE,
                        drainNodeId: 0,
                        drainNodeInputName:   "Second number"
                    },
                    {
                        sourceType:      ConnectionSourceType.NODE,
                        sourceNodeId: 0,
                        sourceNodeOutputName: "Product",
                        drainType:      ConnectionDrainType.NODE,
                        drainNodeId: 2,
                        drainNodeInputName:   "First number"
                    },
                    {
                        sourceType: ConnectionSourceType.CONSTANT,
                        sourceValue: 1.22,
                        drainType: ConnectionDrainType.NODE,
                        drainNodeId: 2,
                        drainNodeInputName: "Second number"
                    },
                    {
                        sourceType: ConnectionSourceType.NODE,
                        sourceNodeId: 2,
                        sourceNodeOutputName: "Product",
                        drainType: ConnectionDrainType.OUTPUT,
                        outputName: "pay"
                    },
                    {
                        sourceType:      ConnectionSourceType.INPUT,
                        inputName: "time",
                        drainType:      ConnectionDrainType.OUTPUT,
                        outputName: "time"
                    },
                    {
                        sourceType: ConnectionSourceType.CONSTANT,
                        sourceValue: 1.22,
                        drainType: ConnectionDrainType.OUTPUT,
                        outputName: "VAT"
                    },
                ]
            }
        );
        
        const inputMap: Map<string, unknown> = new Map<string, unknown>();
        inputMap.set("discount", 0.8);
        inputMap.set("costPerHour", 12);
        inputMap.set("time", 1.5);
        
        const result = composition.calculate(inputMap, {
            [DatumType.BOOLEAN]:   new Map<string, unknown>(),
            [DatumType.COLOR]:     new Map<string, unknown>(),
            [DatumType.COLOR_TEMP]: new Map<string, unknown>(),
            [DatumType.DATE]:      new Map<string, unknown>(),
            [DatumType.DATE_TIME]: new Map<string, unknown>(),
            [DatumType.TIME]:      new Map<string, unknown>(),
            [DatumType.NUMBER]:    new Map<string, unknown>(),
            [DatumType.STRING]:    new Map<string, unknown>()
            
        });
        
        expect(result.outputs.get("pay")).toBeCloseTo(0.8 * 12 * 1.5 * 1.22, 7);
        expect(result.outputs.get("time")).toBeCloseTo(1.5, 7);
        expect(result.outputs.get("VAT")).toBeCloseTo(1.22, 7);
    });
});
