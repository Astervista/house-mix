import {BadRequestException, Body, Controller, Delete, Get, Param, Post} from "@nestjs/common";
import {SystemTimer, SystemTimerJSON} from "@common/system/timer/system-timer";
import {TimersService} from "./timers.service";

@Controller('system/timers')
export class TimersController {
    
    
    constructor(
        private readonly timersService: TimersService
    ) {
    
    }
    
    @Get("")
    public async getAll(): Promise<SystemTimerJSON[]> {
        const timers = await this.timersService.getAllTimers();
        return timers.map(timer => timer.toJSON());
    }
    
    
    @Post("")
    public async create(
        @Body()
        data: SystemTimerJSON
    ): Promise<void> {
        if (!SystemTimer.checkOccurrence(data.occurrence, data.type)) {
            throw new BadRequestException("The occurrence is out of range for the chosen type")
        }
        await this.timersService.createTimer(SystemTimer.fromJSON(data));
    }
    
    @Delete("/:name")
    public async delete(
        @Param("name")
        name: string
    ): Promise<void> {
        await this.timersService.deleteTimer(name);
    }
    
}
