import {ActuatorType} from "./actuator";
import {DatumJSON} from "../../mixing/mix/datum";

export interface ActuatorCreateOptions {
    parent?: string;
}

// TODO: We need validation
export interface ActuatorEditChanges {
    name?: string;
    displayName?: string;
    zigbeeAddress?: string;
    type?: ActuatorType;
    exposes?: DatumJSON[];
}
