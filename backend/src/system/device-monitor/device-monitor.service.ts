import {ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {exec} from "node:child_process";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {Serializable} from "../../helpers/constants";
import {DeviceMonitorDevice, DeviceMonitorDeviceJSON} from "@common/system/device-monitor/device-monitor-device";
import {FileService} from "../../helpers/file/file.service";
import {DatumOrigin} from "@common/mixing/mix/datum";
import {SystemOrigin} from "@common/system/constants";
import MixService from "../../mixing/mix/mix.service";
import {EngineService} from "../../engine/engine.service";
import {SettingsService} from "../settings/settings.service";

const SAVE_FILE = "system/device-monitor.json";

@Injectable()
export class DeviceMonitorService extends PersistentDataService<DeviceMonitorServiceData, DeviceMonitorServiceDataJSON> {
    
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
    
    private lastResponses: Map<string, number> = new Map<string, number>();
    private _internetAccess: boolean | null = null;
    
    public static offlineCheck: number       = 5 * 60;
    public static onlineCheck: number        = 60;
    public static unavailableTimeout: number = 5 * 60;
    
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
    
    public async getAllDevices(): Promise<DeviceMonitorDevice[]> {
        const data = await this.data;
        return data.devices.slice();
    }
    
    public async addDevice(device: DeviceMonitorDevice): Promise<void> {
        const data = await this.data;
        const name = device.name;
        if (data.devices.find(otherDevice => otherDevice.name == name) != null) {
            throw new ConflictException("The device already exists");
        }
        data.devices.push(new DeviceMonitorDevice(device.ip, device.name, null));
        this.saveData();
    }
    
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
    
    public async editDevice(edit: DeviceMonitorDevice): Promise<void> {
        const data   = await this.data;
        const device = data.devices.find(otherParam => otherParam.name == edit.name);
        if (device == null) {
            throw new NotFoundException("Device doesn't exist");
        }
        device.ip = edit.ip;
        this.saveData();
    }
    
    public get internetAccess(): boolean | null {
        return this._internetAccess;
    }
}

export class DeviceMonitorServiceData implements Serializable<DeviceMonitorServiceDataJSON> {
    
    public devices: DeviceMonitorDevice[];
    
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
    
    public toJSON(): DeviceMonitorServiceDataJSON {
        return {
            devices: this.devices.map(device => device.toJSON())
        };
    }
    
}

export interface DeviceMonitorServiceDataJSON {
    devices: DeviceMonitorDeviceJSON[];
}

