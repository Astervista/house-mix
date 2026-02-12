import {Injectable} from "@nestjs/common";
import {connect, MqttClient} from "mqtt";
import {DeviceStatus, LightOptions} from "./classes";
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
    
    private _deviceStatusCache: Map<string, unknown> = new Map<string, unknown>();
    
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
                const status: unknown = JSON.parse(payload.toString("utf-8"));
                if (this.devicesToListen.includes(name)) {
                    const oldStatus = this._deviceStatusCache.get(name) ?? null;
                    const subject   = this.deviceToListenSubjects.get(name);
                    subject?.next({old: oldStatus, new: status});
                }
                this._deviceStatusCache.set(name, status);
            }
        });
        
    }
    
    public setStatus(address: string, value: unknown): void {
        this.client.publish(`zigbee2mqtt/0x${address.replace("/", "")}/set`, JSON.stringify(value));
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
