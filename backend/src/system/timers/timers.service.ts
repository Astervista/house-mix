import {ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {SystemTimer, SystemTimerJSON} from "@common/system/timer/system-timer";
import {FileService} from "../../helpers/file/file.service";
import {DatumOrigin} from "@common/mixing/mix/datum";
import {SystemOrigin} from "@common/system/constants";
import MixService from "../../mixing/mix/mix.service";
import {EngineService} from "../../engine/engine.service";

const SAVE_FILE = "system/timers.json";

@Injectable()
export class TimersService extends PersistentDataService<SystemTimerData, SystemTimerDataJSON> {
    
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService,
        @Inject(forwardRef(() => EngineService))
        private engineService: EngineService
    ) {
        super(fileService, SAVE_FILE, SystemTimerData);
    }
    
    public async getAllTimers(): Promise<SystemTimer[]> {
        return (await this.data).timers.slice();
    }
    
    public async createTimer(timer: SystemTimer): Promise<void> {
        const data = await this.data;
        const alreadyExists = data.timers.some(otherParam => otherParam.name == timer.name);
        if (alreadyExists) {
            throw new ConflictException("Timer already exists");
        }
        data.timers.push(timer);
        void this.engineService.updateTimers();
        this.saveData();
    }
    
    public async editTimer(edit: SystemTimer): Promise<void> {
        const data  = await this.data;
        const timer = data.timers.find(otherParam => otherParam.name == edit.name);
        if (timer == null) {
            throw new NotFoundException("Timer doesn't exist");
        }
        timer.displayName = edit.displayName;
        timer.setInfo(edit.type, edit.occurrence);
        void this.engineService.updateTimers();
        this.saveData();
    }
    
    public async deleteTimer(name: string): Promise<void> {
        const data = await this.data;
        const timerToDelete = data.timers.find(otherParam => otherParam.name === name);
        if (timerToDelete == null) {
            throw new NotFoundException("Timer does not exist");
        }
        if (await this.mixService.dependencyExists(DatumOrigin.SYSTEM, SystemOrigin.TIMER, name)) {
            throw new ConflictException("Cannot delete the timer, it's used in a mix");
        }
        const toDeleteIndex = data.timers.indexOf(timerToDelete);
        if (toDeleteIndex !== -1) {
            data.timers.splice(toDeleteIndex, 1);
        }
        void this.engineService.updateTimers();
        this.saveData();
    }
    
}

export class SystemTimerData {
    
    public timers: SystemTimer[];
    
    public nextId: number = 0;
    
    constructor(systemTimerDataJSON?: SystemTimerDataJSON) {
        if (systemTimerDataJSON) {
            this.timers = systemTimerDataJSON.timers.map((systemTimerJSON: SystemTimerJSON) => SystemTimer.fromJSON(systemTimerJSON));
        } else {
            this.timers = [];
        }
    }
    
    public toJSON(): SystemTimerDataJSON {
        return {
            timers: this.timers.map((systemTimer: SystemTimer) => systemTimer.toJSON()),
            nextId: this.nextId
        };
    }
    
}

export interface SystemTimerDataJSON {
    timers: SystemTimerJSON[];
    nextId: number;
}
