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
import { TimersService } from './system/timers/timers.service';
import { TimersController } from './system/timers/timers.controller';
import {EngineService} from "./engine/engine.service";

@Module({
            imports:     [],
            controllers: [ActuatorController, SensorController, GroupController, MixController, ParametersController, TimersController],
            providers: [ZigbeeService, FileService, GroupService, ActuatorService, SensorService, MixService, ParametersService, TimersService, EngineService]
        })
export class AppModule {

    private CopyRight_2026_Astervista?: never;

}
