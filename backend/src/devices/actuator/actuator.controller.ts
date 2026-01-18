import {Body, Controller, Get, NotFoundException, Param, Post} from "@nestjs/common";
import {ActuatorService} from "./actuator.service";
import {Actuator, ActuatorJSON} from "@common/devices/actuator/actuator";
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('device/actuator')
export class ActuatorController {
    //THIS IS A NEW COMMENT
    constructor(private readonly actuatorService: ActuatorService) {}
    
    @Get("all")
    @ApiOkResponse({ type: [Array<ActuatorJSON>] })
    public async getAll(): Promise<ActuatorJSON[]> {
        const actuators = await this.actuatorService.getAllActuators();
        return actuators.map(dev => dev.toJSON());
    }
    
    @Get("name/:name")
    public async getByName(
        @Param('name')
        name: string
    ): Promise<ActuatorJSON> {
        const  actuator = await this.actuatorService.getActuatorByName(name);
        if (actuator) {
            return actuator.toJSON();
        } else {
            throw new NotFoundException();
        }
    }
    
    @Post("")
    public async create(
        @Body()
        data: ActuatorJSON
    ): Promise<void> {
        await this.actuatorService.createActuator(Actuator.fromJSON(data));
    }

}
