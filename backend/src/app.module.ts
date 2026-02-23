import {Module} from "@nestjs/common";
import {ZigbeeService} from "./zigbee/zigbee.service";
import {ActuatorService} from "./devices/actuator/actuator.service";
import {ActuatorController} from "./devices/actuator/actuator.controller";
import {FileService} from "./helpers/file/file.service";
import {GroupService} from "./devices/group/group.service";
import {GroupController} from "./devices/group/group.controller";
import {MixController} from "./mixing/mix/mix.controller";
import MixService from "./mixing/mix/mix.service";
import {SensorService} from "./devices/sensor/sensor.service";
import {SensorController} from "./devices/sensor/sensor.controller";
import {ParametersController} from "./system/parameters/parameters.controller";
import {ParametersService} from "./system/parameters/parameters.service";
import {TimersService} from "./system/timers/timers.service";
import {TimersController} from "./system/timers/timers.controller";
import {EngineService} from "./engine/engine.service";
import {DeviceMonitorService} from "./system/device-monitor/device-monitor.service";
import {DeviceMonitorController} from "./system/device-monitor/device-monitor.controller";
import {AdjustmentsController} from "./system/adjustments/adjustments.controller";
import {AdjustmentsService} from "./system/adjustments/adjustments.service";
import {SettingsService} from "./system/settings/settings.service";
import {SettingsController} from "./system/settings/settings.controller";

@Module({
            imports:     [],
            controllers: [
                ActuatorController, SensorController, GroupController, MixController, ParametersController, TimersController, DeviceMonitorController, AdjustmentsController,
                SettingsController
            ],
            providers:   [
                ZigbeeService, FileService, GroupService, ActuatorService, SensorService, MixService, ParametersService, TimersService, EngineService, DeviceMonitorService,
                AdjustmentsService,
                SettingsService
            ]
        })
export class AppModule {
    
    private _CopyRight_2026_Astervista?: never;

}
