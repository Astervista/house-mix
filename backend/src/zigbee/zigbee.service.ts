import {Injectable} from "@nestjs/common";
import {connect, MqttClient} from "mqtt";
import {Observable, Subject} from "rxjs";
import {AdjustmentAnimationOff, AdjustmentAnimationOn, AdjustmentSplitCommands} from "@common/system/adjustment/adjustment";

export interface StatusUpdate<T> {
    old: T,
    new: T
}

@Injectable()
export class ZigbeeService {
    
    private client: MqttClient;
    
    private devicesToListen: string[] = [];
    
    private deviceToListenSubjects: Map<string, Subject<StatusUpdate<unknown>>> = new Map<string, Subject<StatusUpdate<unknown>>>();
    
    private _deviceStatusCache: Map<string, Record<string, unknown>> = new Map<string, Record<string, unknown>>();
    
    private queue: { address: string, value: Record<string, unknown>, futureSends: Record<string, unknown>[], futureSendDelays: number[] }[] = [];
    
    private queueBusy: boolean = false;
    
    private adjustedPendingTimeout: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>;
    
    public transitionAdjustments: (AdjustmentAnimationOff | AdjustmentAnimationOn | AdjustmentSplitCommands)[] = [];
    
    public static throttleTiming: number = 30;
    
    constructor() {
        
        if ((process.env["MQTT_URL"] == null) || (process.env["MQTT_URL"] === "")) {
            throw new Error("MQTT_URL must be provided");
        }
        
        this.client = connect(process.env["MQTT_URL"], {
            username: process.env["MQTT_USERNAME"],
            password: process.env["MQTT_PASSWORD"]
        });
        
        this.client.on("connect", () => {
            console.log("Connected to mqtt");
        });
        
        this.client.subscribe("zigbee2mqtt/#");
        
        this.client.on("message", (topic, payload) => {
            const topicPieces = topic.split("/").filter(piece => piece !== "");
            const name        = topicPieces[1]?.substring(2);
            if (topicPieces.length == 2 && name != null) {
                const status: Record<string, unknown> = JSON.parse(payload.toString("utf-8")) as Record<string, unknown>;
                if (this.devicesToListen.includes(name)) {
                    const oldStatus = this._deviceStatusCache.get(name) ?? null;
                    const subject   = this.deviceToListenSubjects.get(name);
                    subject?.next({old: oldStatus, new: status});
                }
                this._deviceStatusCache.set(name, status);
            }
        });
        
    }
    
    public checkAdditionForChanges(currentStatus: Record<string, unknown>, addition: Record<string, unknown>): boolean {
        const currentKeys = Object.keys(currentStatus);
        for (const key of Object.keys(addition)) {
            if (currentKeys.includes(key)) {
                const currentValue = currentStatus[key];
                if (currentValue instanceof Object) {
                    if (this.checkAdditionForChanges(currentValue as Record<string, unknown>, addition[key] as Record<string, unknown>)) {
                        return true;
                    }
                } else if (currentValue !== addition[key]) {
                    return true;
                }
            }
        }
        return false;
    }
    
    public setStatus(address: string, deviceName: string, value: Record<string, unknown>): void {
        for (const key of Object.keys(value)) {
            if (value[key] == null) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete value[key];
            }
        }
        const transitionAdjustmentOff =
                  this.transitionAdjustments.find((adjustment): adjustment is AdjustmentAnimationOff =>
                                                      adjustment.data.actuatorName == deviceName && adjustment instanceof AdjustmentAnimationOff);
        const transitionAdjustmentOn  =
                  this.transitionAdjustments.find((adjustment): adjustment is AdjustmentAnimationOn =>
                                                      adjustment.data.actuatorName == deviceName && adjustment instanceof AdjustmentAnimationOn);
        const splitAdjustment         =
                  this.transitionAdjustments.find((adjustment): adjustment is AdjustmentSplitCommands =>
                                                      adjustment.data.actuatorName == deviceName && adjustment instanceof AdjustmentSplitCommands);
        
        let futureSends: Record<string, unknown>[] = [];
        let futureSendDelays: number[]             = [];
        const currentStatusForAddress              = this._deviceStatusCache.get(address);
        if (transitionAdjustmentOff != null && currentStatusForAddress != null) {
            if ("brightness" in value && value["brightness"] == 0) {
                value["state"] = "OFF";
                delete value["brightness"];
                delete value["color_temp"];
            }
            if ("state" in value && value["state"] == "OFF") {
                delete value["brightness"];
                delete value["color_temp"];
            }
            if ("brightness" in value && value["brightness"] as number > 0) {
                value["state"] = "ON";
            }
            if ("transition" in value && value["transition"] == 0) {
                delete value["transition"];
            }
            if (
                "state" in currentStatusForAddress
                && currentStatusForAddress["state"] == "ON"
                && (
                    ("state" in value && value["state"] == "OFF")
                ) && ("transition" in value)) {
                const newCommand = {...value};
                futureSends.push(newCommand);
                futureSendDelays.push(value["transition"] as number);
                delete newCommand["transition"];
                
                value["state"]      = "ON";
                value["brightness"] = transitionAdjustmentOff.data.minValidBrightness;
            }
        }
        if (transitionAdjustmentOn != null && currentStatusForAddress != null) {
            if ("brightness" in value && value["brightness"] == 0) {
                value["state"] = "OFF";
                delete value["brightness"];
                delete value["color_temp"];
            }
            if ("state" in value && value["state"] == "OFF") {
                delete value["brightness"];
                delete value["color_temp"];
            }
            if ("brightness" in value && value["brightness"] as number > 0) {
                value["state"] = "ON";
            }
            if ("transition" in value && value["transition"] == 0) {
                delete value["transition"];
            }
            if (
                "state" in currentStatusForAddress
                && currentStatusForAddress["state"] == "OFF"
                && (
                    ("state" in value && value["state"] == "ON")
                ) && ("transition" in value)) {
                futureSends.push({...value});
                futureSendDelays.push(0.05);
                
                value["brightness"] = transitionAdjustmentOn.data.minValidBrightness;
                delete value["transition"];
            }
        }
        if (splitAdjustment) {
            const oldFutureSend = futureSends;
            futureSends         = [];
            futureSendDelays    = [];
            let split           = this.splitCommand(value);
            value               = split.shift() as Record<string, unknown>;
            futureSends.push(...split);
            futureSendDelays.push(...split.map(s => "transition" in s ? (s["transition"] as number) : 0));
            for (const send of oldFutureSend) {
                split = this.splitCommand(send);
                futureSends.push(...split);
                futureSendDelays.push(...split.map(s => "transition" in s ? (s["transition"] as number) + 500 : 0));
            }
        }
        this.enqueue(address, value, futureSends, futureSendDelays);
    }
    
    private splitCommand(command: Record<string, unknown>): Record<string, unknown>[] {
        const result: Record<string, unknown>[] = [];
        if (!("transition" in command) || command["transition"] == 0) {
            result.push(command);
            return result;
        }
        for (const property of SPLITTABLE_PROPERTIES) {
            if (command[property] != null) {
                const cleanCommand: Record<string, unknown> = {};
                for (const key of Object.keys(command)) {
                    if (key == property || !SPLITTABLE_PROPERTIES.includes(key)) {
                        cleanCommand[key] = command[key];
                    }
                }
                result.push(cleanCommand);
            }
        }
        return result;
    }
    
    private enqueue(address: string, value: Record<string, unknown>, futureSends: Record<string, unknown>[], futureSendDelays: number[]): void {
        const currentStatusForAddress = this._deviceStatusCache.get(address);
        const needsUpdate             = currentStatusForAddress == null || this.checkAdditionForChanges(currentStatusForAddress, value);
        const pendingUpdate           = this.queue.find(item => item.address == address);
        if (needsUpdate && pendingUpdate == null) {
            this.queue.push({address, value, futureSends, futureSendDelays});
        } else if (needsUpdate && pendingUpdate != null) {
            pendingUpdate.value            = value;
            pendingUpdate.futureSends      = futureSends;
            pendingUpdate.futureSendDelays = futureSendDelays;
        } else if (!needsUpdate && pendingUpdate != null) {
            this.queue.splice(this.queue.indexOf(pendingUpdate), 1);
        } else if (!needsUpdate && pendingUpdate == null) {
            const nextFuture = futureSends.shift();
            if (nextFuture != null) {
                this.enqueue(address, nextFuture, futureSends, futureSendDelays.slice(1));
                return;
            }
        }
        this.advanceSendQueue();
    }
    
    private advanceSendQueue(): void {
        if (this.queueBusy) {
            return;
        }
        if (this.queue.length > 0) {
            this.queueBusy = true;
            const item     = this.queue.shift();
            if (item) {
                this.client.publish(`zigbee2mqtt/0x${item.address.replace("/", "")}/set`, JSON.stringify(item.value));
                const futureSends = item.futureSends;
                if (futureSends.length > 0) {
                    if (this.adjustedPendingTimeout.has(item.address)) {
                        clearTimeout(this.adjustedPendingTimeout.get(item.address));
                    }
                    const futureDelay = item.futureSendDelays.shift() as number;
                    this.adjustedPendingTimeout.set(item.address, setTimeout(() => {
                        this.enqueue(item.address, futureSends.shift() as Record<string, unknown>, futureSends, item.futureSendDelays);
                    }, futureDelay * 1000));
                }
            }
            setTimeout(() => {
                this.queueBusy = false;
                this.advanceSendQueue();
            }, ZigbeeService.throttleTiming);
            
        }
    }
    
    public listenDeviceStatus(address: string): Observable<StatusUpdate<unknown>> {
        address = address.toLowerCase();
        let subject: Subject<StatusUpdate<unknown>> | null = null;
        if (this.devicesToListen.includes(address)) {
            subject = this.deviceToListenSubjects.get(address) as (Subject<StatusUpdate<unknown>> | null) ?? null;
        } else {
            this.devicesToListen.push(address);
        }
        if (subject == null) {
            subject = new Subject<StatusUpdate<unknown>>();
            this.deviceToListenSubjects.set(address, subject);
        }
        if (this._deviceStatusCache.has(address)) {
            subject.next({
                             old: null,
                             new: this._deviceStatusCache.get(address)
                         });
        }
        return subject.asObservable();
    }
    
    public unlistenDeviceStatus(): void {
        this.devicesToListen.length = 0;
    }
    
    public get deviceStatusCache(): ReadonlyMap<string, unknown> {
        return this._deviceStatusCache;
    }
    
}


const SPLITTABLE_PROPERTIES = ["brightness", "color_temp", "color"];
