import {Injectable} from "@nestjs/common";
import {connect, MqttClient} from "mqtt";
import {Observable, Subject} from "rxjs";

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
    
    private queue: { address: string, value: unknown }[] = [];
    
    private queueBusy: boolean = false;
    
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
    
    public setStatus(address: string, value: Record<string, unknown>): void {
        const currentStatusForAddress = this._deviceStatusCache.get(address);
        const needsUpdate             = currentStatusForAddress == null || this.checkAdditionForChanges(currentStatusForAddress, value);
        const pendingUpdate           = this.queue.find(item => item.address == address);
        if (needsUpdate && pendingUpdate == null) {
            this.queue.push({address, value});
        } else if (needsUpdate && pendingUpdate != null) {
            pendingUpdate.value = value;
        } else if (!needsUpdate && pendingUpdate != null) {
            this.queue.splice(this.queue.indexOf(pendingUpdate), 1);
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
            }
            setTimeout(() => {
                this.queueBusy = false;
                this.advanceSendQueue();
            }, 30);
            
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
