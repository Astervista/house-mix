import {Injectable, NotFoundException} from "@nestjs/common";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {SystemTimer, SystemTimerJSON} from "@common/system/timer/system-timer";
import {FileService} from "../../helpers/file/file.service";
import {SystemParameter} from "@common/system/parameter/system-parameter";

const SAVE_FILE = "system/timers.json";

@Injectable()
export class TimersService extends PersistentDataService<SystemTimerData, SystemTimerDataJSON> {
    
    constructor(fileService: FileService) {
        super(fileService, SAVE_FILE, SystemTimerData);
    }
    
    public async getAllTimers(): Promise<SystemTimer[]> {
        return (await this.data).timers.slice();
    }
    
    public async createTimer(timer: SystemTimer): Promise<void> {
        const data = await this.data;
        const alreadyExists = data.timers.some(otherParam => otherParam.name == timer.name);
        if (alreadyExists) {
            throw new Error("Timer already exists");
        }
        data.timers.push(timer);
        this.saveData();
    }
    
    public async deleteTimer(name: string): Promise<void> {
        const data = await this.data;
        const timerToDelete = data.timers.find(otherParam => otherParam.name === name);
        if (timerToDelete == null) {
            throw new NotFoundException("Timer does not exist");
        }
        const toDeleteIndex = data.timers.indexOf(timerToDelete);
        if (toDeleteIndex !== -1) {
            data.timers.splice(toDeleteIndex, 1);
        }
        this.saveData();
    }
    
}

class SystemTimerData {
    
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

interface SystemTimerDataJSON {
    timers: SystemTimerJSON[];
    nextId: number;
}
