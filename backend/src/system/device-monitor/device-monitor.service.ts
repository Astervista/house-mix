/**
 * This module contains the {@link DeviceMonitorService|`DeviceMonitorService`} class, handling the business logic for monitoring
 * devices connected to the network.
 *
 * @module
 */
import {ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {exec} from "node:child_process";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {Serializable} from "../../helpers/constants";
import {DeviceMonitorDevice, DeviceMonitorDeviceJSON} from "@common/system/device-monitor/device-monitor-device";
import {FileService} from "../../helpers/file/file.service";
import {DatumOrigin} from "@common/mixing/mix/datum";
import {SystemOrigin} from "@common/system/constants";
import {MixService} from "../../mixing/mix/mix.service";
import {EngineService} from "../../engine/engine.service";
import {SettingsService} from "../settings/settings.service";

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';
// noinspection ES6UnusedImports
import type {SystemSettings} from '@common/system/settings/settings';
// noinspection ES6UnusedImports
import type {Device } from '@common/devices/device';

/**
 * The path of the file where to save the data about the {@link DeviceMonitorService|`DeviceMonitorService`}.
 */
const SAVE_FILE = "system/device-monitor.json";

/**
 * This service handles the business logic about the monitoring of devices connected to the network.
 *
 * The devices monitored by this service are not the smart home {@link Device|`Device`s} connected to the
 * Zigbee coordinator, they are generic devices connected with IP to the same network the server is connected to.
 * These usually are devices like computers or smartphones connected to the network, but any IP address can be
 * monitored.
 *
 * The monitoring of the system gets done using a simple ping call to the IP. The system periodically checks
 * for the responses to the ping call following this logic:
 * - All devices that are offline get checked every {@link SystemSettings#onlineCheck|`SystemSettings.onlineCheck`}
 *   seconds for connection. As soon as a device responds to the ping call, it's considered online;
 * - All devices that are online get checked every {@link SystemSettings#offlineCheck|`SystemSettings.offlineCheck`}
 *   seconds to renew their connected status. When a device doesn't respond to a ping, a timeout starts: after
 *   {@link SystemSettings#unavailableTimeout|`SystemSettings.unavailableTimeout`} seconds not responding the device
 *   is considered offline.
 */
@Injectable()
export class DeviceMonitorService extends PersistentDataService<DeviceMonitorServiceData, DeviceMonitorServiceDataJSON> {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {FileService} fileService - The service handling persistent storage. Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} business logic. Instantiated by dependency injection.
     * @param {EngineService} engineService - The service responsible for the mixing engine execution. Instantiated by dependency injection.
     * @param {SettingsService} settingsService - The service handling {@link SystemSettings|`SystemSettings`}. Instantiated by dependency injection.
     */
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService,
        @Inject(forwardRef(() => EngineService))
        private engineService: EngineService,
        settingsService: SettingsService
    ) {
        super(fileService, SAVE_FILE, DeviceMonitorServiceData);
        this.doAfterLoad(async () => {
            await settingsService.getSettings();
            void this.checkStatus(true);
            void this.checkStatus(false);
        });
    }
    
    /** A map containing the last response timestamp of the monitored devices, indexed by IP. */
    private lastResponses: Map<string, number> = new Map<string, number>();
    /** Whether access to the web has been detected. */
    private _internetAccess: boolean | null = null;
    
    /** The interval (seconds) at which devices are checked for disconnection. This applies only to devices already online. */
    public static offlineCheck: number       = 5 * 60;
    /** The interval (seconds) at which devices are checked for reconnection. This applies only to devices that are offline. */
    public static onlineCheck: number        = 60;
    /** How much time (seconds) after a device is first detected offline needs to pass for it to be considered not available. */
    public static unavailableTimeout: number = 5 * 60;
    
    /**
     * Ping all the monitored devices and update their status, possibly requiring a full system recalculation if
     * the status of some changes.
     *
     * @param {boolean} checkOnline - Whether the function also checks web access status and updates
     *                                {@link DeviceMonitorService#_internetAccess|`DeviceMonitorService._internetAccess`}.
     * @returns {Promise<void>}
     */
    private async checkStatus(checkOnline: boolean): Promise<void> {
        const data: DeviceMonitorServiceData = await this.data;
        const promises: Promise<{ device: DeviceMonitorDevice | null, result: boolean }>[] = [];
        const now: number                    = Date.now();
        for (const device of data.devices) {
            const deviceIP = device.ip;
            if (deviceIP != null && device.connected !== checkOnline) {
                promises.push(this.checkOne(deviceIP).then(result => {
                    if (result) {
                        this.lastResponses.set(deviceIP, Date.now());
                    } else {
                        const lastResponse = this.lastResponses.get(deviceIP);
                        if (lastResponse != null) {
                            result = now - lastResponse <= 1000 * DeviceMonitorService.unavailableTimeout;
                        } else {
                            result = false;
                        }
                    }
                    return ({device, result});
                }));
            }
        }
        if (checkOnline) {
            promises.push(this.checkOne().then(result => {
                this._internetAccess = result;
                return ({device: null, result});
            }));
        }
        const results        = await Promise.all(promises);
        const internetStatus                 = checkOnline ? (results.find(result => result.device == null)?.result ?? false) : true;
        if (internetStatus) {
            const changedDevices: DeviceMonitorDevice[] = [];
            for (const result of results) {
                if (result.device != null) {
                    if (result.device.connected == null) {
                        result.device.connected = result.result;
                        changedDevices.push(result.device);
                    } else {
                        if (result.device.connected != result.result) {
                            result.device.connected = result.result;
                            changedDevices.push(result.device);
                        }
                    }
                }
            }
            if (changedDevices.length > 0) {
                this.engineService.deviceStatusChanged(changedDevices);
            }
        }
        setTimeout(() => {void this.checkStatus(checkOnline);}, 1000 * (checkOnline ? DeviceMonitorService.onlineCheck : DeviceMonitorService.offlineCheck));
    }
    
    /**
     * Execute the ping requests for a single device, and eventually return the result of the probing.
     *
     * @param {string} address - The IP of the device to ping.
     * @returns {Promise<boolean>} Whether the ping was successful.
     */
    private checkOne(address?: string): Promise<boolean> {
        if (address != null && !/^(((?!25?[6-9])[12]\d|[1-9])?\d\.?\b){4}$/.test(address)) {
            return Promise.resolve(false);
        }
        address ??= "astervista.com";
        return new Promise<boolean>((resolve) => {
            exec(`ping -c 4 -t 500 ${address}`, function (err, stdout) {
                const parse = /(\d+) (packets )?received/.exec(stdout);
                if (parseInt(parse?.[1] ?? "0") > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }
    
    /**
     * Get all {@link DeviceMonitorDevice|`DeviceMonitorDevice`s} in the system.
     *
     * @returns {Promise<DeviceMonitorDevice[]>} An array containing the resulting {@link DeviceMonitorDevice|`DeviceMonitorDevice`s}.
     */
    public async getAllDevices(): Promise<DeviceMonitorDevice[]> {
        const data = await this.data;
        return data.devices.slice();
    }
    
    /**
     * Adds a new {@link DeviceMonitorDevice|`DeviceMonitorDevice`} to the system.
     *
     * @param {DeviceMonitorDevice} device - The {@link DeviceMonitorDevice|`DeviceMonitorDevice`} to add.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a device with the same name already exists.
     */
    public async addDevice(device: DeviceMonitorDevice): Promise<void> {
        const data = await this.data;
        const name = device.name;
        if (data.devices.find(otherDevice => otherDevice.name == name) != null) {
            throw new ConflictException("The device already exists");
        }
        data.devices.push(new DeviceMonitorDevice(device.ip, device.name, null));
        this.saveData();
    }
    
    /**
     * Removes a {@link DeviceMonitorDevice|`DeviceMonitorDevice`} from the system by its name.
     *
     * @param {string} name - The name of the device to remove.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the device is used in a mix.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link DeviceMonitorDevice|`DeviceMonitorDevice`} was found with the specific name.
     */
    public async deleteDevice(name: string): Promise<void> {
        const data           = await this.data;
        const deviceToDelete = data.devices.find(otherDevice => otherDevice.name === name);
        if (deviceToDelete == null) {
            throw new NotFoundException("Device does not exist");
        }
        if (await this.mixService.dependencyExists(DatumOrigin.SYSTEM, SystemOrigin.DEVICE_STATUS, name)) {
            throw new ConflictException("Cannot delete the device, it's used in a mix");
        }
        const toDeleteIndex = data.devices.indexOf(deviceToDelete);
        if (toDeleteIndex !== -1) {
            data.devices.splice(toDeleteIndex, 1);
        }
        this.saveData();
    }
    
    /**
     * Edit a {@link DeviceMonitorDevice|`DeviceMonitorDevice`}'s properties, given its name.
     * This call cannot change the name of the device, to achieve this delete and recreate the device.
     *
     * @param {DeviceMonitorDevice} edit - The {@link DeviceMonitorDevice|`DeviceMonitorDevice`} with the properties to update.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link DeviceMonitorDevice|`DeviceMonitorDevice`} was found with the specific name.
     */
    public async editDevice(edit: DeviceMonitorDevice): Promise<void> {
        const data   = await this.data;
        const device = data.devices.find(otherParam => otherParam.name == edit.name);
        if (device == null) {
            throw new NotFoundException("Device doesn't exist");
        }
        device.ip = edit.ip;
        this.saveData();
    }
    
    /**
     * Whether access to the web has been detected.
     */
    public get internetAccess(): boolean | null {
        return this._internetAccess;
    }
}

/**
 * The persistent data structure used by {@link DeviceMonitorService|`DeviceMonitorService`}
 * for persisting data about the monitored devices.
 */
export class DeviceMonitorServiceData implements Serializable<DeviceMonitorServiceDataJSON> {
    
    /**
     * The list of devices being monitored.
     */
    public devices: DeviceMonitorDevice[];
    
    /**
     * Creates an instance of the class from its serialization.
     *
     * @param {DeviceMonitorServiceDataJSON} deviceMonitorServiceDataJSON - The serialization of the class to recreate into an instance of the class.
     */
    constructor(deviceMonitorServiceDataJSON?: DeviceMonitorServiceDataJSON) {
        if (deviceMonitorServiceDataJSON != null) {
            this.devices = deviceMonitorServiceDataJSON.devices.map(device => {
                delete device.connected;
                return DeviceMonitorDevice.fromJSON(device);
            });
        } else {
            this.devices = [];
        }
    }
    
    /**
     * Converts the device monitor data instance into its JSON representation.
     *
     * @returns {DeviceMonitorServiceDataJSON} The JSON representation of `this`.
     */
    public toJSON(): DeviceMonitorServiceDataJSON {
        return {
            devices: this.devices.map(device => device.toJSON())
        };
    }
    
}

/**
 * The serialization of the class {@link DeviceMonitorServiceData|`DeviceMonitorServiceData`}.
 */
export interface DeviceMonitorServiceDataJSON {
    /**
     * Serialization of the property {@link DeviceMonitorServiceData#devices|`devices`}.
     */
    devices: DeviceMonitorDeviceJSON[];
}
