/**
 *  This module contains constants related to the {@link SystemComponent|`SystemComponent`}.
 *
 *  @module
 */
import {TimerType} from '@common/system/timer/system-timer';
import {SystemOrigin} from '@common/system/constants';
import {AdjustmentType} from '@common/system/adjustment/adjustment';

// noinspection ES6UnusedImports
import type {SystemComponent} from './system.component';
// noinspection ES6UnusedImports
import type {Adjustment} from '@common/system/adjustment/adjustment';
// noinspection ES6UnusedImports
import type {SystemParameter} from '@common/system/parameter/system-parameter';
// noinspection ES6UnusedImports
import type {SystemTimer} from '@common/system/timer/system-timer';
// noinspection ES6UnusedImports
import type {DeviceMonitorDevice} from '@common/system/device-monitor/device-monitor-device';

/** The possible entities handled by the {@link SystemComponent|`SystemComponent`}. */
export
/** The possible entities handled by the {@link SystemComponent|`SystemComponent`}. */
enum SystemEntity {
    /** A {@link SystemParameter|`SystemParameter`}. */
    PARAMETER     = 'PARAMETER',
    /** A {@link SystemTimer|`SystemTimer`}. */
    TIMER         = 'TIMER',
    /** A {@link DeviceMonitorDevice|`DeviceMonitorDevice`}. */
    DEVICE_STATUS = 'DEVICE_STATUS',
    /** An {@link Adjustment|`Adjustment`}. */
    ADJUSTMENT    = 'ADJUSTMENT'
}

/** Display text for {@link TimerType|`TimerType`}. */
export
/** Display text for {@link TimerType|`TimerType`}. */
const SYSTEM_TIMER_TYPE_DISPLAY: Record<TimerType, string> = {
    /** Display text for {@link TimerType.DAILY|`DAILY`}. */
    DAILY:  'Every day',
    /** Display text for {@link TimerType.HOURLY|`HOURLY`}. */
    HOURLY: 'Every hour',
    /** Display text for {@link TimerType.MINUTE_INTERVAL|`MINUTE_INTERVAL`}. */
    MINUTE_INTERVAL: 'Interval'
};

/** Display text for {@link SystemOrigin|`SystemOrigin`}. */
export
/** Display text for {@link SystemOrigin|`SystemOrigin`}. */
const SYSTEM_ORIGIN_DISPLAY: Record<SystemOrigin, string> = {
    /** Display text for {@link SystemOrigin.PARAMETER|`PARAMETER`}. */
    PARAMETER:     'Parameter',
    /** Display text for {@link SystemOrigin.TIMER|`TIMER`}. */
    TIMER:         'Timer',
    /** Display text for {@link SystemOrigin.DEVICE_STATUS|`DEVICE_STATUS`}. */
    DEVICE_STATUS: 'Device online',
    /** Display text for {@link SystemOrigin.ENVIRONMENT|`ENVIRONMENT`}. */
    ENVIRONMENT:   'Environment'
};

/** Display text for {@link AdjustmentType|`AdjustmentType`}. */
export
/** Display text for {@link AdjustmentType|`AdjustmentType`}. */
const ADJUSTMENT_TYPE_DISPLAY: Record<AdjustmentType, string>     = {
    /** Display text for {@link AdjustmentType.ANIMATION_ON|`ANIMATION_ON`}. */
    ANIMATION_ON:   'Lamp on transition',
    /** Display text for {@link AdjustmentType.ANIMATION_OFF|`ANIMATION_OFF`}. */
    ANIMATION_OFF:  'Lamp off transition',
    /** Display text for {@link AdjustmentType.SPLIT_COMMANDS|`SPLIT_COMMANDS`}. */
    SPLIT_COMMANDS: 'Split complex commands'
};

/** Description for {@link AdjustmentType|`AdjustmentType`}. */
export
/** Description for {@link AdjustmentType|`AdjustmentType`}. */
const ADJUSTMENT_TYPE_DESCRIPTION: Record<AdjustmentType, string> = {
    /** Description for {@link AdjustmentType.ANIMATION_ON|`ANIMATION_ON`}. */
    ANIMATION_ON:   'When some lightbulbs are turned on, they may ignore the transition duration field and turn on immediately no matter what. Applying this adjustment to a bulb, when a command' +
                    'to turn on is sent with a transition property, the system will translate that command into two commands: a on command without transition to the lowest brightness value, ' +
                    'and a second brightness change command with the transition property.',
    /** Description for {@link AdjustmentType.ANIMATION_OFF|`ANIMATION_OFF`}. */
    ANIMATION_OFF:  'When some lightbulbs are turned off, they may ignore the transition duration field and turn off immediately no matter what. Applying this adjustment to a bulb, when a command' +
                    'to turn off is sent with a transition property, the system will translate that command into two commands: a brightness change command with the transition property' +
                    'to the lowest brightness value, and a second off command without transition.',
    /** Description for {@link AdjustmentType.SPLIT_COMMANDS|`SPLIT_COMMANDS`}. */
    SPLIT_COMMANDS: 'Some lights can only transition between one single parameter (brightness, color, temperature) at a time, otherwise the change is done instantly. Applying this adjustment ' +
                    'to a lightbulb transform one single command with different changes into multiple sequential commands with the isolated parameters, if a transition is set'
};
