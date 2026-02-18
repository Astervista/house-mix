import {Test, TestingModule} from "@nestjs/testing";
import {AdjustmentsService} from "./adjustments.service";

describe("AdjustmentsService", () => {
    let service: AdjustmentsService;
    
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
                                                                         providers: [AdjustmentsService]
                                                                     }).compile();
        
        service = module.get<AdjustmentsService>(AdjustmentsService);
    });
    
    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
