import {Test, TestingModule} from "@nestjs/testing";
import {DeviceMonitorService} from "./device-monitor.service";

describe("Service", () => {
    let service: DeviceMonitorService;
    
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
                                                                         providers: [DeviceMonitorService]
                                                                     }).compile();
        
        service = module.get<DeviceMonitorService>(DeviceMonitorService);
    });
    
    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
