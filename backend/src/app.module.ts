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

@Module({
  imports: [],
  controllers: [ActuatorController, GroupController, SceneController, MixController],
  providers: [ZigbeeService, ActuatorService, FileService, GroupService, SceneService, MixService],
})
export class AppModule {


}
