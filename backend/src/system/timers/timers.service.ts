/**
 * This module contains the {@link TimersService|`TimersService`} class, handling the business logic for {@link SystemTimer|`SystemTimer`s}.
 *
 * @module
 */
import {ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {SystemTimer, SystemTimerJSON} from "@common/system/timer/system-timer";
import {FileService} from "../../helpers/file/file.service";
import {DatumOrigin} from "@common/mixing/mix/datum";
import {SystemOrigin} from "@common/system/constants";
import {MixService} from "../../mixing/mix/mix.service";
import {EngineService} from "../../engine/engine.service";

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';

/**
 * The path of the file where to save the data about the {@link TimersService|`TimersService`}.
 */
const SAVE_FILE = "system/timers.json";

/**
 * This service handles the business logic for {@link SystemTimer|`SystemTimer`s}.
 *
 * System timers are rules that define a periodical timeout that triggers recalculation of the system,
 * generally to be used for updating calculations that are time-depending but are not connected
 * to any sensor and thus are not self-updating.
 *
 * This service does not implement the timing functions, it only offers functions to create,
 * edit and delete {@link SystemTimer|`SystemTimer`s}, and notifies the {@link EngineService|`EngineService`}
 * that will then handle all the timekeeping.
 */
@Injectable()
export class TimersService extends PersistentDataService<SystemTimerData, SystemTimerDataJSON> {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {FileService} fileService - The service handling persistent storage. Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} business logic. Instantiated by dependency injection.
     * @param {EngineService} engineService - The service responsible for the mixing engine execution. Instantiated by dependency injection.
     */
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService,
        @Inject(forwardRef(() => EngineService))
        private engineService: EngineService
    ) {
        super(fileService, SAVE_FILE, SystemTimerData);
    }
    
    /**
     * Get all {@link SystemTimer|`SystemTimer`s} in the system.
     *
     * @returns {Promise<SystemTimer[]>} An array containing the resulting {@link SystemTimer|`SystemTimer`s}.
     */
    public async getAllTimers(): Promise<SystemTimer[]> {
        return (await this.data).timers.slice();
    }
    
    /**
     * Adds a new {@link SystemTimer|`SystemTimer`} to the system.
     *
     * @param {SystemTimer} timer - The {@link SystemTimer|`SystemTimer`} to add.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a timer with the same name already exists.
     */
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
    
    /**
     * Updates an existing {@link SystemTimer|`SystemTimer`}.
     *
     * @param {SystemTimer} edit - The updated {@link SystemTimer|`SystemTimer`}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemTimer|`SystemTimer`} was found with the specific name.
     */
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
    
    /**
     * Removes a {@link SystemTimer|`SystemTimer`} from the system by its name.
     *
     * @param {string} name - The name of the timer to remove.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the timer is used in a mix.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemTimer|`SystemTimer`} was found with the specific name.
     */
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

/**
 * The persistent data structure used by {@link TimersService|`TimersService`}
 * for persisting data about the {@link SystemTimer|`SystemTimer`s}.
 */
export class SystemTimerData {

    /**
     * The list of system timers.
     */
    public timers: SystemTimer[];

    /**
     * Creates an instance of the class from its serialization.
     *
     * @param {SystemTimerDataJSON} systemTimerDataJSON - The serialization of the class to recreate into an instance of the class.
     */
    constructor(systemTimerDataJSON?: SystemTimerDataJSON) {
        if (systemTimerDataJSON) {
            this.timers = systemTimerDataJSON.timers.map((systemTimerJSON: SystemTimerJSON) => SystemTimer.fromJSON(systemTimerJSON));
        } else {
            this.timers = [];
        }
    }

    /**
     * Converts the system timer data instance into its JSON representation.
     *
     * @returns {SystemTimerDataJSON} The JSON representation of `this`.
     */
    public toJSON(): SystemTimerDataJSON {
        return {
            timers: this.timers.map((systemTimer: SystemTimer) => systemTimer.toJSON())
        };
    }
}

/**
 * The serialization of the class {@link SystemTimerData|`SystemTimerData`}.
 */
export interface SystemTimerDataJSON {
    /**
     * Serialization of the property {@link SystemTimerData#timers|`timers`}.
     */
    timers: SystemTimerJSON[];
}
