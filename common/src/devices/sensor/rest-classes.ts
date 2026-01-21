import {SensorType} from "./sensor";
import {DatumJSON} from "../../mixing/mix/datum";

export interface SensorCreateOptions {
    parent?: string;
}

// TODO: We need validation
export interface SensorEditChanges {
    name?: string;
    displayName?: string;
    zigbeeAddress?: string;
    type?: SensorType;
    exposes?: DatumJSON[];
}
