import { Injectable } from '@nestjs/common';
import {connect, MqttClient} from "mqtt";
import {DeviceStatus, LightOptions} from "./classes";
import {Observable, Subject} from "rxjs";

@Injectable()
export class ZigbeeService {
    
    private client: MqttClient;
    
    private devicesToListen: string[] = [];
    
    private deviceToListenSubjects: Map<string, Subject<unknown>> = new Map<string, Subject<unknown>>();
    
    constructor() {
        
        if ((process.env["MQTT_URL"] == null) || (process.env["MQTT_URL"] === '')) {
            throw new Error('MQTT_URL must be provided');
        }
        
        this.client = connect(process.env["MQTT_URL"], {
            username: process.env["MQTT_USERNAME"],
            password: process.env["MQTT_PASSWORD"],
        });
        
        
        
        this.client.subscribe('zigbee2mqtt/#');
        
        this.client.on('message', (topic, payload) => {
            const topicPieces = topic.split('/').filter(piece => piece !== '');
            const name = topicPieces[1];
            if (topicPieces.length == 2 && name != null) {
                if (this.devicesToListen.includes(name)) {
                    const subject = this.deviceToListenSubjects.get(name) as (Subject<unknown> | null);
                    subject?.next( JSON.parse(payload.toString('utf-8')));
                }
            }
        })
        
    }
    
    public setLight<T extends LightOptions>(name: string, value: T): void {
        this.client.publish(`zigbee2mqtt/${name.replace("/", "")}/set`, JSON.stringify(value));
    }
    
    public listenDeviceStatus<T extends DeviceStatus>(name: string): Observable<T> {
        let subject: Subject<T> | null = null;
        if (this.devicesToListen.includes(name)) {
            subject = this.deviceToListenSubjects.get(name) as (Subject<T> | null) ?? null;
        } else {
            this.devicesToListen.push(name);
        }
        if (subject == null) {
            subject = new Subject<T>();
            this.deviceToListenSubjects.set(name, subject as Subject<unknown>);
        }
        return subject.asObservable();
    }
    
}
