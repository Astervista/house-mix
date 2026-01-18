import {Mix, ConnectionDrainType, ConnectionSourceType} from "./mix";
import {DatumType} from "./datum";
import {ElaborationNodeCode, ElaborationNodeMathOperation, ElaborationNodeMultiplication} from "./elaboration-node";

describe("Composition", () => {
    test("Testing composition calculation", () => {
        const composition = Mix.fromJSON(
            {
                id:          1,
                inputs:      [
                    {
                        type: DatumType.NUMBER,
                        name: "discount"
                    },
                    {
                        type: DatumType.NUMBER,
                        name: "costPerHour"
                    },
                    {
                        type: DatumType.NUMBER,
                        name: "time"
                    }
                ],
                outputs:     [
                    {
                        type: DatumType.NUMBER,
                        name: "pay"
                    },
                    {
                        type: DatumType.NUMBER,
                        name: "time"
                    },
                    {
                        type: DatumType.NUMBER,
                        name: "VAT"
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
                        drainNodeInputName: ElaborationNodeMathOperation.FIRST_NUMBER_INPUT
                    }, {
                        sourceType:      ConnectionSourceType.INPUT,
                        inputName:          "time",
                        drainType:      ConnectionDrainType.NODE,
                        drainNodeId:        1,
                        drainNodeInputName: ElaborationNodeMathOperation.SECOND_NUMBER_INPUT
                    }, {
                        sourceType:      ConnectionSourceType.INPUT,
                        inputName: "discount",
                        drainType:      ConnectionDrainType.NODE,
                        drainNodeId: 0,
                        drainNodeInputName: ElaborationNodeMathOperation.FIRST_NUMBER_INPUT
                    },
                    {
                        sourceType:      ConnectionSourceType.NODE,
                        sourceNodeId: 1,
                        sourceNodeOutputName: ElaborationNodeMultiplication.OUTPUT_NAME,
                        drainType:      ConnectionDrainType.NODE,
                        drainNodeId: 0,
                        drainNodeInputName: ElaborationNodeMathOperation.SECOND_NUMBER_INPUT
                    },
                    {
                        sourceType:      ConnectionSourceType.NODE,
                        sourceNodeId: 0,
                        sourceNodeOutputName: ElaborationNodeMultiplication.OUTPUT_NAME,
                        drainType:      ConnectionDrainType.NODE,
                        drainNodeId: 2,
                        drainNodeInputName: ElaborationNodeMathOperation.FIRST_NUMBER_INPUT
                    },
                    {
                        sourceType: ConnectionSourceType.CONSTANT,
                        sourceValue: 1.22,
                        drainType: ConnectionDrainType.NODE,
                        drainNodeId: 2,
                        drainNodeInputName: ElaborationNodeMathOperation.SECOND_NUMBER_INPUT
                    },
                    {
                        sourceType: ConnectionSourceType.NODE,
                        sourceNodeId: 2,
                        sourceNodeOutputName: ElaborationNodeMultiplication.OUTPUT_NAME,
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
        
        const result = composition.calculate(inputMap);
        
        expect(result.get("pay")).toBeCloseTo(0.8 * 12 * 1.5 * 1.22, 7);
        expect(result.get("time")).toBeCloseTo(1.5, 7);
        expect(result.get("VAT")).toBeCloseTo(1.22, 7);
    });
});
