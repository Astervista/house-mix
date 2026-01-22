import { TimerType } from "@common/system/timer/system-timer";

export const SYSTEM_TIMER_TYPE_DISPLAY: Record<TimerType, string> = {
    DAILY: 'Every day',
    HOURLY: 'Every hour',
    MINUTE_INTERVAL: 'Interval'
}
