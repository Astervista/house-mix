import {TimerType} from '@common/system/timer/system-timer';
import {SystemOrigin} from '@common/system/constants';
import {AdjustmentType} from '@common/system/adjustment/adjustment';

export enum SystemEntity {
    PARAMETER     = 'PARAMETER',
    TIMER         = 'TIMER',
    DEVICE_STATUS = 'DEVICE_STATUS',
    ADJUSTMENT    = 'ADJUSTMENT'
}

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

export const ADJUSTMENT_TYPE_DISPLAY: Record<AdjustmentType, string>     = {
    ANIMATION_ON:   'Lamp on transition',
    ANIMATION_OFF:  'Lamp off transition',
    SPLIT_COMMANDS: 'Split complex commands'
};
export const ADJUSTMENT_TYPE_DESCRIPTION: Record<AdjustmentType, string> = {
    ANIMATION_ON:   'When some lightbulbs are turned on, they may ignore the transition duration field and turn on immediately no matter what. Applying this adjustment to a bulb, when a command' +
                    'to turn on is sent with a transition property, the system will translate that command into two commands: a on command without transition to the lowest brightness value, ' +
                    'and a second brightness change command with the transition property.',
    ANIMATION_OFF:  'When some lightbulbs are turned off, they may ignore the transition duration field and turn off immediately no matter what. Applying this adjustment to a bulb, when a command' +
                    'to turn off is sent with a transition property, the system will translate that command into two commands: a brightness change command with the transition property' +
                    'to the lowest brightness value, and a second off command without transition.',
    SPLIT_COMMANDS: 'Some lights can only transition between one single parameter (brightness, color, temperature) at a time, otherwise the change is done instantly. Applying this adjustment ' +
                    'to a lightbulb transform one single command with different changes into multiple sequential commands with the isolated parameters, if a transition is set'
};
