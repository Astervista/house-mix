import {IsEnum, IsInt, IsNotEmpty, IsPositive, Matches, Min} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";

export class SystemTimer {
    
    private readonly _type: TimerType;
    private readonly _occurrence: number;
    
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
    
    public get type(): TimerType {
        return this._type;
    }
    
    public get occurrence(): number {
        return this._occurrence;
    }
    
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
    
    public toJSON(): SystemTimerJSON {
        return new SystemTimerJSON(this.name, this.displayName, this.type, this.occurrence);
    }
    
    public static fromJSON(timerJSON: SystemTimerJSON): SystemTimer {
        return new SystemTimer(timerJSON.name, timerJSON.displayName, timerJSON.type, timerJSON.occurrence);
    }
    
}

export enum TimerType {
    DAILY           = "DAILY",
    HOURLY          = "HOURLY",
    MINUTE_INTERVAL = "MINUTE_INTERVAL"
}

export class SystemTimerJSON {
    
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    @IsNotEmpty()
    public displayName: string;
    
    @IsEnum(TimerType)
    public type: TimerType;
    
    @IsInt()
    @Min(0)
    public occurrence: number;
    
    constructor(
        name: string,
        displayName: string,
        type: TimerType,
        occurrence: number
    ) {
        this.name       = name;
        this.displayName = displayName;
        this.type       = type;
        this.occurrence = occurrence;
    }
    
}
