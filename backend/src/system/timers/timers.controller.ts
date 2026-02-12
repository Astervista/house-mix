import {BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post} from "@nestjs/common";
import {SystemTimer, SystemTimerJSON} from "@common/system/timer/system-timer";
import {TimersService} from "./timers.service";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";
import {SystemOrigin} from "@common/system/constants";
import MixService from "../../mixing/mix/mix.service";

@Controller('system/timers')
export class TimersController {
    
    
    constructor(
        private readonly timersService: TimersService,
        private readonly mixService: MixService
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
    
    @Patch("/:name")
    public async edit(
        @Param("name")
        name: string,
        @Body()
        data: SystemTimerJSON
    ): Promise<void> {
        if (!SystemTimer.checkOccurrence(data.occurrence, data.type)) {
            throw new BadRequestException("The occurrence is out of range for the chosen type");
        }
        const systemTimer = SystemTimer.fromJSON(data);
        if (systemTimer.name != name) {
            throw new BadRequestException("Cannot change the name of the timer with this call");
        }
        await this.timersService.editTimer(systemTimer);
    }
    
    @Delete("/:name")
    public async delete(
        @Param("name")
        name: string
    ): Promise<void> {
        await this.timersService.deleteTimer(name);
    }
    
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param("name")
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.getDeleteLocks(SystemOrigin.TIMER, name);
    }
    
}
