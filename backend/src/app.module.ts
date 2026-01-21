import { Module } from '@nestjs/common';
import { ZigbeeService } from './zigbee/zigbee.service';
import { ActuatorService } from './devices/actuator/actuator.service';
import { ActuatorController } from './devices/actuator/actuator.controller';
import { FileService } from './helpers/file/file.service';
import { GroupService } from './devices/group/group.service';
import { GroupController } from './devices/group/group.controller';
import { SceneController } from './mixing/scene/scene.controller';
import { SceneService } from './mixing/scene/scene.service';
import { MixController } from './mixing/mix/mix.controller';
import { MixService } from './mixing/mix/mix.service';
import { SensorService } from "./devices/sensor/sensor.service";
import {SensorController} from "./devices/sensor/sensor.controller";

@Module({
  imports: [],
  controllers: [ActuatorController, SensorController, GroupController, SceneController, MixController],
  providers: [ZigbeeService, FileService, GroupService, ActuatorService, SensorService, SceneService, MixService],
})
export class AppModule {


}
