import {Test, TestingModule} from "@nestjs/testing";
import {DeviceMonitorController} from "./device-monitor.controller";

describe("DeviceMonitorController", () => {
    let controller: DeviceMonitorController;
    
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
                                                                         controllers: [DeviceMonitorController]
                                                                     }).compile();
        
        controller = module.get<DeviceMonitorController>(DeviceMonitorController);
    });
    
    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
