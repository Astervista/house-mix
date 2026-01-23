export interface LightOptions {__lightOptions: never}

export type LightOptionsBrightness = LightOptions & {brightness: number};

export interface DeviceStatus {__deviceStatus: never}

export type DeviceStatusButton = DeviceStatus & { action?: string}

