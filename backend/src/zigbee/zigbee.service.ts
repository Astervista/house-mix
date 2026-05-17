/**
 * This module contains the {@link ZigbeeService|`ZigbeeService`} that monitors mqtt for changes on devices on the system.
 *
 * @module
 */
import {Injectable} from "@nestjs/common";
import {connect, MqttClient} from "mqtt";
import {Observable, Subject} from "rxjs";
import {AdjustmentAnimationOff, AdjustmentAnimationOn, AdjustmentSplitCommands} from "@common/system/adjustment/adjustment";
import Timeout = NodeJS.Timeout;

// noinspection ES6UnusedImports
import type {Adjustment} from '@common/system/adjustment/adjustment';
// noinspection ES6UnusedImports
import type {Device} from '@common/devices/device';

/**
 * An update on a value.
 *
 * @template T - The type of variable.
 */
export interface StatusUpdate<T> {
    /** The old value. */
    old: T,
    /** The new value. */
    new: T
}

/**
 * After how much time (ms) of not sending a command to a {@link Device|`Device`}, the service will force an update, even if
 * the value hasn't changed, to assure realignment of {@link Device|`Device`s} that drift.
 */
export
/**
 * After how much time (ms) of not sending a command to a {@link Device|`Device`}, the service will force an update, even if
 * the value hasn't changed, to assure realignment of {@link Device|`Device`s} that drift.
 */
const FORCE_UPDATE_PERIOD = 60 * 1000 * 5;

/**
 * A `set` command waiting to be sent to `/zigbee2mqtt/{device}/set`.
 */
export interface EnqueuedItem {
    /** The address of the device to be updated, corresponding to the `/zigbee2mqtt/{address}/set` topic where to send the command to. */
    address: string;
    /** The object containing the new values to set. This will be serialized and sent as body to the `set` topic. */
    value: Record<string, unknown>;
    /**
     * If this command requires some other `set` messages to be scheduled after it is sent, these are the
     * {@link EnqueuedItem#value|`value`s} of the new items enqueued after this one gets sent. The
     * {@link EnqueuedItem#address|`address`} will be the same as the current one, and the `futureSends` will
     * be sent one by one.
     */
    futureSends: Record<string, unknown>[];
    /**
     * If this command requires some other `set` messages to be scheduled after it is sent, these are the
     * delays (in seconds) to wait after the previous message before sending each corresponding item in
     * {@link EnqueuedItem#futureSends|`futureSends`}.
     */
    futureSendDelays: number[];
}

/**
 * This service monitors mqtt for changes on {@link Device|`Device`s} on the system.
 *
 * Every device that published on the mqtt server at the `/zigbee2mqtt/{device}` topic can be monitored for changes on the status.
 * The service offers the {@link ZigbeeService#listenDeviceStatus| `listenDeviceStatus()`} function to listen for the status changes
 * on a specific {@link Device|`Device`} identified on the system with its topic.
 *
 * Every device can be sent a message to change its behavior at the `/zigbee2mqtt/{device}/set` topic through the
 * {@link ZigbeeService#setStatus| `setStatus()`} function. The service handles throttling of multiple simultaneous
 * set messages to avoid clogging of the zigbee network and unwanted states. It also applies {@link Adjustment|`Adjustment`s}
 * to the messages to correct unwanted behavior.
 *
 * This service also keeps a cache of the latest status of a {@link Device|`Device`} it is aware of in the
 * {@link ZigbeeService#deviceStatusCache|`deviceStatusCache`} property that can be queried to get the latest values.
 */
@Injectable()
export class ZigbeeService {
    
    /**
     * The client to connect to the mqtt server.
     */
    private client: MqttClient;
    
    /**
     * The `name`s of the devices corresponding to the `/zigbee2mqtt/{name}` topics that should be
     * listened for changes.
     */
    private devicesToListen: string[] = [];
    
    /**
     * The {@link Subject|`Subject`s} where to detach the observers from when a new listen is requested. The same
     *  {@link Subject|`Subject`s} are where the system pushes the new status when a message from zigbee2mqtt
     *  arrives on the `/zigbee2mqtt/{name}` topics.
     *
     *  Keys are the device address (topic name), values are the {@link Subject|`Subject`s}.
     */
    private deviceToListenSubjects: Map<string, Subject<StatusUpdate<unknown>>> = new Map<string, Subject<StatusUpdate<unknown>>>();
    
    /**
     * The cache containing all the latest known statuses of the devices publishing to the `/zigbee2mqtt/{name}` mqtt topics.
     *
     * Keys are the device address (topic name), values are the latest known content of the topic.
     *
     * @type {Map<string, Record<string, unknown>>}
     * @private
     */
    private _deviceStatusCache: Map<string, Record<string, unknown>> = new Map<string, Record<string, unknown>>();
    
    /**
     * Timestamp of the last time a device was set sending a message to `/zigbee2mqtt/{device}/set`.
     *
     * Keys are the device address (topic name), values are the timestamp.
     */
    private _lastDeviceUpdate: Map<string, number> = new Map<string, number>();
    
    /**
     * The list of requested updates to be sent to `/zigbee2mqtt/{device}/set`, waiting in queue to be
     * sent while the sending is throttle, in order of arrival.
     */
    private queue: EnqueuedItem[] = [];
    
    /**
     * Whether the {@link ZigbeeService#queue|`queue`} is busy elaborating. This can mean that the
     * {@link ZigbeeService#queue|`queue`} is not empty, or that the last command is still being elaborated.
     */
    private queueBusy: boolean = false;
    
    /**
     * When an {@link EnqueuedItem|`EnqueuedItem`} has a chain of {@link EnqueuedItem#futureSends|`futureSends`}
     * to be sent with {@link EnqueuedItem#futureSendDelays|`futureSendDelays`}, this contains the
     * {@link Timeout|handles} to the timeouts that handle the delays.
     *
     * Keys are the device address, values are the {@link Timeout|timeout handles}.
     */
    private adjustedPendingTimeout: Map<string, Timeout> = new Map<string, Timeout>;
    
    /**
     * The {@link Adjustment|`Adjustment`s} to be applied when sending messages to devices through mqtt.
     */
    public transitionAdjustments: (AdjustmentAnimationOff | AdjustmentAnimationOn | AdjustmentSplitCommands)[] = [];
    
    /**
     * The minimum time in milliseconds to wait between two messages are sent to a devices through mqtt.
     */
    public static throttleTiming: number = 30;
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     */
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
    
    /**
     * Checks whether a new status to be set to a device is different from the previous saved value, to avoid clogging
     * the zigbee network with useless commands.
     *
     * @param {Record<string, unknown>} currentStatus - The latest known status of the device.
     * @param {Record<string, unknown>} addition - The new values to be sent.
     * @returns {boolean} `true` if a change is detected, `false` otherwise.
     *                    Only the values in the `addition` parameter get checked for changes.
     */
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
            } else {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Send a new status update to a device in the zigbee network through mqtt at the `/zigbee2mqtt/{address}/set` topic,
     * applying the relevant {@link Adjustment|`Adjustment`s}.
     *
     * @param {string} address - The address of the device to send the command to (its topic on mqtt).
     * @param {string} deviceName - The {@link Device#name|`name`} of the {@link Device|`Device`} this command is for.
     *                              Used to check against {@link Adjustment|`Adjustment`s}.
     * @param {Record<string, unknown>} value - The new values to be sent, as the message body.
     */
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
    
    /**
     * Split a `/zigbee2mqtt/{device}/set` command into non-conflicting commands.
     *
     * @param {Record<string, unknown>} command - The command to split.
     * @returns {Record<string, unknown>[]} - The split commands.
     * @see {@link AdjustmentSplitCommands|`AdjustmentSplitCommands`} for the meaning of "non-conflicting" commands.
     */
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
    
    /**
     * Enqueue a command to be sent as soon as possible to a device through the mqtt `/zigbee2mqtt/{address}/set` topic.
     *
     * @param {string} address - The address of the device to send the command to (its topic on mqtt).
     * @param {Record<string, unknown>} value - The new values to be sent, as the message body.
     * @param {Record<string, unknown>[]} futureSends - The values to be sent to the same device after the requested one.
     * @param {number[]} futureSendDelays - The delays after which `futureSends` get sent.
     * @see {@link EnqueuedItem|`EnqueuedItem`} for the meaning of `futureSends` and `futureSendDelays`.
     */
    private enqueue(
        address: string,
        value: Record<string, unknown>,
        futureSends: Record<string, unknown>[],
        futureSendDelays: number[]
    ): void {
        const currentStatusForAddress = this._deviceStatusCache.get(address);
        const lastUpdate  = this._lastDeviceUpdate.get(address) ?? 0;
        const needsUpdate = currentStatusForAddress == null || (lastUpdate - Date.now() > FORCE_UPDATE_PERIOD) || this.checkAdditionForChanges(currentStatusForAddress, value);
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
        if (needsUpdate) {
            this._lastDeviceUpdate.set(address, Date.now());
        }
        this.advanceSendQueue();
    }
    
    /**
     * If the queue is free, advance it by sending the next command.
     */
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
    
    /**
     * Listen for a device's status changes on mqtt. This function returns an {@link Observable|`Observable`}
     * that gets updated every time a new status gets published to a specific device's mqtt topic (`/zigbee2mqtt/{device}`).
     *
     * @param {string} address - The address of the device to listen for, corresponding to the `/zigbee2mqtt/{address}` topic
     *                           where the new status is published.
     * @returns {Observable<StatusUpdate<unknown>>} - The {@link Observable|`Observable`} to observe to get the updates.
     */
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
    
    /**
     * Cancel all the listened devices.
     */
    public unlistenDeviceStatus(): void {
        this.devicesToListen.length = 0;
    }
    
    /**
     * The cache containing the latest known status of the devices publishing their status to
     * `/zigbee2mqtt/{device}/`.
     */
    public get deviceStatusCache(): ReadonlyMap<string, unknown> {
        return this._deviceStatusCache;
    }
    
}

/**
 * The properties that are considered conflicting in `set` commands, and thus may need to be sent in different commands.
 *
 * @see {@link AdjustmentSplitCommands|`AdjustmentSplitCommands`} for the meaning of "conflicting" properties.
 */
const SPLITTABLE_PROPERTIES = ["brightness", "color_temp", "color"];
