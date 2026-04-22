/**
 * This module contains {@link SystemTimer|`SystemTimer`} and the related classes, to define
 * a timer that triggers recalculation of the system at a specific interval.
 *
 * @module
 */
import {IsEnum, IsInt, IsNotEmpty, Matches, Min} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";

/**
 * A timer that triggers recalculation of the system at a specific interval.
 *
 * The interval can be of three types, described in {@link TimerType|`TimerType`}.
 * The customization of the type is done by the property {@link SystemTimer#occurrence|`occurrence`}, with this meaning:
 * - if the type is {@link TimerType.DAILY|`DAILY`}, {@link SystemTimer#occurrence|`occurrence`} is the number of minutes after midnight,
 * - if the type is {@link TimerType.HOURLY|`HOURLY`}, {@link SystemTimer#occurrence|`occurrence`} is the number of minutes after the start of the hour,
 * - if the type is {@link TimerType.MINUTE_INTERVAL|`MINUTE_INTERVAL`}, {@link SystemTimer#occurrence|`occurrence`} is the interval in minutes.
 */
export class SystemTimer {
    
    /** The type of timer. */
    private _type: TimerType;
    /** A number to customize the timer, according to its {@link SystemTimer#type|`type`}. */
    private _occurrence: number;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - The unique name to identify the timer.
     * @param {string} displayName - The name that is used to display the timer in the UI.
     * @param {TimerType} type - The type of timer.
     * @param {number} occurrence - A number to customize the timer, according to `type`.
     */
    constructor(
        public name: string,
        public displayName: string,
        type: TimerType,
        occurrence: number
    ) {
        this._type = type;
        if (SystemTimer.checkOccurrence(occurrence, type)) {
            this._occurrence = occurrence;
        } else {
            this._occurrence = SystemTimer.defaultOccurrence(type);
        }
    }
    
    /** The type of timer, that defines how the next trigger is calculated. */
    public get type(): TimerType {
        return this._type;
    }
    
    /** A number to customize the timer, according to its {@link SystemTimer#type|`type`}. */
    public get occurrence(): number {
        return this._occurrence;
    }
    
    /**
     * A safe way to set {@link SystemTimer#type|`type`} and {@link SystemTimer#occurrence|`occurrence`},
     * that silently fails if the occurrence is not valid for the type, keeping the old value.
     *
     * @param {TimerType} type - The type of timer.
     * @param {number} occurrence - A number to customize the timer, according to `type`.
     */
    public setInfo(type: TimerType, occurrence: number): void {
        if (SystemTimer.checkOccurrence(occurrence, type)) {
            this._type       = type;
            this._occurrence = occurrence;
        }
    }
    
    /**
     * Calculates the occurrence from the current moment. If the current moment is exactly an occurrence, the next different occurrence is returned.
     *
     * @returns {Date} The next occurrence.
     */
    public getNextOccurrence(): Date;
    /**
     * Calculates the occurrence that follows a specific date. If the date is exactly an occurrence, the next different occurrence is returned.
     *
     * @param {Date} fromDate - The date from which to calculate the next occurrence.
     * @returns {Date} The next occurrence.
     */
    public getNextOccurrence(fromDate: Date): Date;
    /**
     * Calculates the occurrence that follows a specific date, or the current moment. If the date is exactly an occurrence, the next different occurrence is returned.
     *
     * @param {Date} [fromDate] - The date from which to calculate the next occurrence. If not specified, the current date is used.
     * @returns {Date} The next occurrence.
     */
    public getNextOccurrence(fromDate: Date = new Date): Date {
        switch (this._type) {
            case TimerType.DAILY: {
                const sameDay = new Date(
                    fromDate.getFullYear(),
                    fromDate.getMonth(),
                    fromDate.getDate(),
                    0,
                    this.occurrence
                );
                if (sameDay > fromDate) {
                    return sameDay;
                } else {
                    return new Date(
                        fromDate.getFullYear(),
                        fromDate.getMonth(),
                        fromDate.getDate() + 1,
                        0,
                        this.occurrence
                    );
                }
            }
            case TimerType.HOURLY: {
                const sameHour = new Date(
                    fromDate.getFullYear(),
                    fromDate.getMonth(),
                    fromDate.getDate(),
                    fromDate.getHours(),
                    this.occurrence
                );
                if (sameHour > fromDate) {
                    return sameHour;
                } else {
                    return new Date
                    (
                        fromDate.getFullYear(),
                        fromDate.getMonth(),
                        fromDate.getDate(),
                        fromDate.getHours() + 1,
                        this.occurrence
                    );
                }
            }
            case TimerType.MINUTE_INTERVAL:
                return new Date((Math.floor(fromDate.getTime() / (1000 * 60 * this.occurrence)) + 1) * 1000 * 60 * this.occurrence);
        }
    }
    
    /**
     * Checks whether an {@link SystemTimer#occurrence|`occurrence`} value is valid for a specific type of timer.
     *
     * A value is valid for {@link TimerType.DAILY|`DAILY`} or {@link TimerType.HOURLY|`HOURLY`} if it's between the
     * period's bounds, and valid for {@link TimerType.MINUTE_INTERVAL|`MINUTE_INTERVAL`} if it's a positive non-zero
     * integer value.
     *
     * @param {number} occurrence - The occurrence value to check.
     * @param {TimerType} type - The type of timer.
     * @returns {boolean} `true` if the value is valid, `false` otherwise.
     */
    public static checkOccurrence(occurrence: number, type: TimerType): boolean {
        switch (type) {
            case TimerType.DAILY:
                return occurrence < 60 * 24;
            case TimerType.HOURLY:
                return occurrence < 60;
            case TimerType.MINUTE_INTERVAL:
                return occurrence < 60 * 24 && occurrence >= 1 && occurrence % 1 == 0;
        }
    }
    
    /**
     * Gets a valid default value for {@link SystemTimer#occurrence|`occurrence`} for a specific type of timer.
     *
     * The default value is midnight for {@link TimerType.DAILY|`DAILY`}, the start of the hour for {@link TimerType.HOURLY|`HOURLY`}, and 10 minutes for
     * {@link TimerType.MINUTE_INTERVAL|`MINUTE_INTERVAL`}.
     *
     * @param {TimerType} type - The type of timer.
     * @returns {number} A valid default value.
     */
    public static defaultOccurrence(type: TimerType): number {
        switch (type) {
            case TimerType.DAILY:
                return 0;
            case TimerType.HOURLY:
                return 0;
            case TimerType.MINUTE_INTERVAL:
                return 10;
        }
    }
    
    /**
     * Converts the system timer instance into its JSON representation.
     *
     * @returns {SystemTimerJSON} The JSON representation of `this`.
     */
    public toJSON(): SystemTimerJSON {
        return new SystemTimerJSON(this.name, this.displayName, this.type, this.occurrence);
    }
    
    /**
     * Constructs a new {@link SystemTimer|`SystemTimer`} instance from a given JSON representation.
     *
     * @param {SystemTimerJSON} systemTimerJSON - The JSON representation of the system timer.
     * @returns {SystemTimer} The system timer object constructed from the provided JSON.
     */
    public static fromJSON(systemTimerJSON: SystemTimerJSON): SystemTimer {
        return new SystemTimer(
            systemTimerJSON.name,
            systemTimerJSON.displayName,
            systemTimerJSON.type,
            systemTimerJSON.occurrence
        );
    }
    
}

/**
 * The type defining how a {@link SystemTimer|`SystemTimer`}'s trigger is calculated.
 */
export enum TimerType {
    /** The timer triggers once a day at a specific minute into the day. */
    DAILY           = "DAILY",
    /** The timer triggers once per hour at a specific minute into the hour. */
    HOURLY          = "HOURLY",
    /** The timer triggers at a specific interval in minutes. */
    MINUTE_INTERVAL = "MINUTE_INTERVAL"
}

/**
 * The serialization of the class {@link SystemTimer|`SystemTimer`}.
 */
export class SystemTimerJSON {
    
    /**
     * Serialization of the property {@link SystemTimer#name|`name`}.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    /**
     * Serialization of the property {@link SystemTimer#displayName|`displayName`}.
     */
    @IsNotEmpty()
    public displayName: string;
    
    /**
     * Serialization of the property {@link SystemTimer#type|`type`}.
     */
    @IsEnum(TimerType)
    public type: TimerType;
    
    /**
     * Serialization of the property {@link SystemTimer#occurrence|`occurrence`}.
     */
    @IsInt()
    @Min(0)
    public occurrence: number;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - Value for {@link SystemTimer#name|`name`}.
     * @param {string} displayName - Value for {@link SystemTimer#displayName|`displayName`}.
     * @param {TimerType} type - Value for {@link SystemTimer#type|`type`}.
     * @param {number} occurrence - Value for {@link SystemTimer#occurrence|`occurrence`}.
     */
    constructor(
        name: string,
        displayName: string,
        type: TimerType,
        occurrence: number
    ) {
        this.name        = name;
        this.displayName = displayName;
        this.type        = type;
        this.occurrence  = occurrence;
    }
    
}
