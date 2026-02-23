import {DatumType} from '@common/mixing/mix/datum';
import {isDevMode} from '@angular/core';

export const API_ENDPOINT: string  = isDevMode() ? 'http://localhost:3001/' : '/house-mix/api/';
export const RESOURCE_ROOT: string = isDevMode() ? '/' : '/house-mix/';

export const SNACKBAR_TIMEOUT = 5000;
export const TOOLTIP_TIMEOUT = 1000;

export function getDateDisplayFormat(type: DatumType): string {
    return type == DatumType.DATE ? "yyyy-MM-dd" : (type == DatumType.TIME ? "HH:mm:ss" : "yyyy-MM-dd HH:mm:ss")
}

export enum MainPages {
    DEVICES = 'DEVICES',
    MIXING  = 'MIXING',
    SYSTEM  = 'SYSTEM'
}
