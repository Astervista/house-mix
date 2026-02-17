import {TimerType} from '@common/system/timer/system-timer';
import {SystemOrigin} from '@common/system/constants';


export const SYSTEM_TIMER_TYPE_DISPLAY: Record<TimerType, string> = {
    DAILY:  'Every day',
    HOURLY: 'Every hour',
    MINUTE_INTERVAL: 'Interval'
};

export const SYSTEM_ORIGIN_DISPLAY: Record<SystemOrigin, string> = {
    PARAMETER:     'Parameter',
    TIMER:         'Timer',
    DEVICE_STATUS: 'Device online',
    ENVIRONMENT:   'Environment'
};
