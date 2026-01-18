import {Datum, DatumType} from "../../mixing/mix/datum";
import {IsPositive, Min} from "class-validator";

export abstract class Event {
    
    public readonly _outputs: readonly Datum[];
    
    protected constructor(public readonly id: number, public readonly type: EventType, outputs: Datum[]) {
        this._outputs = outputs;
    }
    
    
    public toJSON(): EventJSON {
        return {
            id:   this.id,
            type: this.type
        };
    }
    
    public static fromJSON(eventJSON: EventJSON): Event {
        switch (eventJSON.type) {
            case EventType.DEVICE_STATUS_CHANGE: {
                return new EventDeviceStatusChange(eventJSON.id, eventJSON as EventDeviceStatusChangeJSON)
            }
            case EventType.TIME_CHANGE: {
                return new EventTimeChange(eventJSON.id, eventJSON as EventTimeChangeJSON)
            }
        }
        throw new Error("Not implemented");
    }
    
}

export enum EventType {
    DEVICE_STATUS_CHANGE = "DEVICE_STATUS_CHANGE",
    TIME_CHANGE          = "TIME_CHANGE"
}

export class EventJSON {
    
    @IsPositive()
    public id: number;
    public type: EventType;
    
    constructor(id: number, type: EventType) {
        this.id   = id;
        this.type = type;
    }
    
}


interface EventDeviceStatusChangeJSON extends EventJSON {
    valueType: DatumType,
    parsingFunction: EventDeviceStatusChangeParsingFunction
}

export enum EventDeviceStatusChangeParsingFunction {
    EXTRACT_ACTION = "EXTRACT_ACTION"
}

export class EventDeviceStatusChangeError extends Error {
    constructor() {
        super("There was an error while processing the status of an event");
    }
}

export class EventDeviceStatusChange extends Event {
    
    private readonly parsingFunction: EventDeviceStatusChangeParsingFunction
    private readonly output: Datum;
    
    constructor(id: number, eventJSON: EventDeviceStatusChangeJSON) {
        const output =
                  new Datum("New status", eventJSON.valueType, false)
        super(id, EventType.DEVICE_STATUS_CHANGE, [
            output
              ]
        );
        this.output = output
        this.parsingFunction = eventJSON.parsingFunction;
    }
    
    public parseValue(eventPayloadJSON: unknown): unknown {
        let value: unknown;
        switch (this.parsingFunction) {
            case EventDeviceStatusChangeParsingFunction.EXTRACT_ACTION: {
                value = (eventPayloadJSON as {action: string}).action;
            }
        }
        if (this.output.checkValue(value)) {
            throw new EventDeviceStatusChangeError();
        }
        return value;
    }
    
}


class EventTimeChangeJSON extends EventJSON {
    /**
     * The polling frequency in seconds
     */
    @IsPositive()
    @Min(10)
    public pollingFrequency: number;
    
    constructor(id: number, pollingFrequency: number) {
        super(id, EventType.TIME_CHANGE);
        this.pollingFrequency = pollingFrequency;
    }
}

export class EventTimeChange extends Event {
    
    public readonly pollingFrequency: number;
    
    constructor(id: number, eventJSON: EventTimeChangeJSON) {
        super(id,
              EventType.TIME_CHANGE,
              [
                  new Datum("Time", DatumType.TIME, false)
              ])
        this.pollingFrequency = eventJSON.pollingFrequency;
    }
}
