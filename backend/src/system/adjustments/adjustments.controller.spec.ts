import {Test, TestingModule} from "@nestjs/testing";
import {AdjustmentsController} from "./adjustments.controller";

describe("AdjustmentsController", () => {
    let controller: AdjustmentsController;
    
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
                                                                         controllers: [AdjustmentsController]
                                                                     }).compile();
        
        controller = module.get<AdjustmentsController>(AdjustmentsController);
    });
    
    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
