import { DatumType } from "@common/mixing/mix/datum";

export const API_ENDPOINT = "http://localhost:3001/"

export const SNACKBAR_TIMEOUT = 5000;
export const TOOLTIP_TIMEOUT = 1000;

export function getDateDisplayFormat(type: DatumType): string {
    return type == DatumType.DATE ? "yyyy-MM-dd" : (type == DatumType.TIME ? "HH:mm:ss" : "yyyy-MM-dd HH:mm:ss")
}
