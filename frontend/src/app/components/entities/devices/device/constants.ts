/**
 * This module contains all the constants regarding {@link Device|`Device`s} useful for UI, display and frontend uses.
 *
 * @module
 */
import {ActuatorType} from '@common/devices/actuator/actuator';
import {SensorType} from '@common/devices/sensor/sensor';
import {Datum, DatumType} from '@common/mixing/mix/datum';

// noinspection ES6UnusedImports
import type {Device} from '@common/devices/device';
// noinspection ES6UnusedImports
import type {Actuator} from '@common/devices/actuator/actuator';
// noinspection ES6UnusedImports
import type {Sensor} from '@common/devices/sensor/sensor';

/**
 * The displayable string version of each {@link ActuatorType|`ActuatorType`}.
 */
export
/**
 * The displayable string version of each {@link ActuatorType|`ActuatorType`}.
 */
const ACTUATOR_TYPE_DISPLAY: Record<ActuatorType, string> = {
    [ActuatorType.BULB]:    'Lightbulb',
    [ActuatorType.STRIP]:   'Light strip',
    [ActuatorType.BELL]:    'Doorbell',
    [ActuatorType.CURTAIN]: 'Curtains',
    [ActuatorType.RELAY]:   'Relay',
    [ActuatorType.WATER]:   'Water valve',
    [ActuatorType.PLUG]:    'Plug',
    [ActuatorType.OTHER]:   'Other',
    [ActuatorType.UNKNOWN]: 'Unknown'
};

/**
 * The icon file to use for each {@link ActuatorType|`ActuatorType`}.
 */
export
/**
 * The icon file to use for each {@link ActuatorType|`ActuatorType`}.
 */
const ACTUATOR_TYPE_ICON: Record<ActuatorType, string> = {
    [ActuatorType.BULB]:    'bulb.svg',
    [ActuatorType.STRIP]:   'strip.svg',
    [ActuatorType.BELL]:    'bell.svg',
    [ActuatorType.CURTAIN]: 'curtains.svg',
    [ActuatorType.RELAY]:   'relay.svg',
    [ActuatorType.WATER]:   'water.svg',
    [ActuatorType.PLUG]:    'plug.svg',
    [ActuatorType.OTHER]:   'other.svg',
    [ActuatorType.UNKNOWN]: 'unknown.svg'
};

/**
 * The displayable string version of each {@link SensorType|`SensorType`}.
 */
export
/**
 * The displayable string version of each {@link SensorType|`SensorType`}.
 */
const SENSOR_TYPE_DISPLAY: Record<SensorType, string> = {
    [SensorType.BUTTON]:               'Button',
    [SensorType.LIGHT]:                'Light sensor',
    [SensorType.MOVEMENT]:             'Movement sensor',
    [SensorType.TEMPERATURE]:          'Thermometer',
    [SensorType.HUMIDITY]:             'Humidity sensor',
    [SensorType.HUMIDITY_TEMPERATURE]: 'Temp and humidity',
    [SensorType.DOOR]:                 'Door sensor',
    [SensorType.SMOKE]:                'Smoke sensor',
    [SensorType.ROTARY]:               'Rotary switch',
    [SensorType.OTHER]:                'Other',
    [SensorType.UNKNOWN]:              'Unknown'
};

/**
 * The icon file to use for each {@link SensorType|`SensorType`}.
 */
export
/**
 * The icon file to use for each {@link SensorType|`SensorType`}.
 */
const SENSOR_TYPE_ICON: Record<SensorType, string> = {
    [SensorType.BUTTON]:               'button.svg',
    [SensorType.LIGHT]:                'light_sensor.svg',
    [SensorType.MOVEMENT]:             'movement.svg',
    [SensorType.TEMPERATURE]:          'thermometer.svg',
    [SensorType.HUMIDITY]:             'humidity.svg',
    [SensorType.HUMIDITY_TEMPERATURE]: 'thermo_humid.svg',
    [SensorType.DOOR]:                 'door.svg',
    [SensorType.SMOKE]:                'smoke.svg',
    [SensorType.ROTARY]:               'rotary.svg',
    [SensorType.OTHER]:                'other.svg',
    [SensorType.UNKNOWN]:              'unknown.svg'
};

/**
 * A list of {@link Datum|`Datum`s} that are suitable for use as
 * {@link Device#exposes|`exposes`} on {@link Device|`Device`s}
 * with specific {@link SensorType|`SensorType`s} or
 * {@link ActuatorType|`ActuatorType`s}.
 */
export interface DeviceLibraryProperty {
    /** A description for this collection of {@link Datum|`Datum`s}. */
    display: string,
    /**
     * The {@link SensorType|`SensorType`s} or {@link ActuatorType|`ActuatorType`s}
     *  this collection is suitable for.
     */
    for: (SensorType | ActuatorType)[],
    /** The collection of {@link Datum|`Datum`s} that can be used as {@link Device#exposes|`exposes`}. */
    data: Datum[]
}

/**
 * A collection of some presets {@link DeviceLibraryProperty|`DeviceLibraryProperty`}
 * to show as examples or presets when creating a new {@link Actuator|`Actuator`}.
 *
 * This list contains:
 *  - **Basic light**: a simple lightbulb with brightness;
 *  - **Temperature lightbulb**: a lightbulb with brightness and color temperature;
 *  - **Color lightbulb**: a lightbulb with brightness and color.
 */
export
/**
 * A collection of some presets {@link DeviceLibraryProperty|`DeviceLibraryProperty`}
 * to show as examples or presets when creating a new {@link Actuator|`Actuator`}.
 *
 * This list contains:
 *  - **Basic light**: a simple lightbulb with brightness;
 *  - **Temperature lightbulb**: a lightbulb with brightness and color temperature;
 *  - **Color lightbulb**: a lightbulb with brightness and color.
 */
const ACTUATOR_PROPERTIES_LIBRARY: DeviceLibraryProperty[] = [
    {
        display: 'Basic light',
        for:     [],
        data:    [
            new Datum(
                'brightness',
                DatumType.NUMBER,
                false
            )
        ]
    },
    {
        display: 'Temperature lightbulb',
        for:     [ActuatorType.BULB],
        data:    [
            new Datum(
                'brightness',
                DatumType.NUMBER,
                false
            ),
            new Datum(
                'color_temp',
                DatumType.COLOR_TEMP,
                true
            )
        ]
    },
    {
        display: 'Color lightbulb',
        for:     [ActuatorType.BULB],
        data:    [
            new Datum(
                'brightness',
                DatumType.NUMBER,
                false
            ),
            new Datum(
                'color',
                DatumType.COLOR,
                true
            )
        ]
    }
];

/**
 * A collection of some presets {@link DeviceLibraryProperty|`DeviceLibraryProperty`}
 * to show as examples or presets when creating a new {@link Sensor|`Sensor`}.
 *
 * This list contains:
 *  - **Button**: a switch, switchboard, button, contact;
 *  - **Temperature**;
 *  - **Humidity**;
 *  - **Temperature and humidity**: a combined sensor;
 *  - **Light sensor**;
 *  - **Occupancy**: a movement or presence sensor;
 *  - **Contact**: a sensor monitoring if a door, window, cabinet, drawer is open or closed.
 *  - **Smoke**: a smoke, air quality, CO sensor.
 */
export
/**
 * A collection of some presets {@link DeviceLibraryProperty|`DeviceLibraryProperty`}
 * to show as examples or presets when creating a new {@link Sensor|`Sensor`}.
 *
 * This list contains:
 *  - **Button**: a switch, switchboard, button, contact;
 *  - **Temperature**;
 *  - **Humidity**;
 *  - **Temperature and humidity**: a combined sensor;
 *  - **Light sensor**;
 *  - **Occupancy**: a movement or presence sensor;
 *  - **Contact**: a sensor monitoring if a door, window, cabinet, drawer is open or closed.
 *  - **Smoke**: a smoke, air quality, CO sensor.
 */
const SENSOR_PROPERTIES_LIBRARY: DeviceLibraryProperty[] = [
    {
        display: 'Button',
        for:     [SensorType.BUTTON],
        data:    [
            new Datum(
                'action',
                DatumType.NUMBER,
                true
            )
        ]
    },
    {
        display: 'Temperature',
        for:     [SensorType.TEMPERATURE, SensorType.HUMIDITY_TEMPERATURE],
        data:    [
            new Datum(
                'temperature',
                DatumType.NUMBER,
                true
            )
        ]
    },
    {
        display: 'Humidity',
        for:     [SensorType.HUMIDITY, SensorType.HUMIDITY_TEMPERATURE],
        data:    [
            new Datum(
                'humidity',
                DatumType.NUMBER,
                true
            )
        ]
    },
    {
        display: 'Temp and humidity',
        for:     [SensorType.HUMIDITY_TEMPERATURE],
        data:    [
            new Datum(
                'temperature',
                DatumType.NUMBER,
                true
            ),
            new Datum(
                'humidity',
                DatumType.NUMBER,
                true
            )
        ]
    },
    {
        display: 'Light sensor',
        for:     [SensorType.LIGHT],
        data:    [
            new Datum(
                'illuminance',
                DatumType.NUMBER,
                true
            )
        ]
    },
    {
        display: 'Occupancy (movement)',
        for:     [SensorType.MOVEMENT],
        data:    [
            new Datum(
                'occupancy',
                DatumType.NUMBER,
                true
            )
        ]
    },
    {
        display: 'Contact (close/open)',
        for:     [SensorType.DOOR],
        data:    [
            new Datum(
                'contact',
                DatumType.BOOLEAN,
                true
            )
        ]
    },
    {
        display: 'Smoke',
        for:     [SensorType.SMOKE],
        data:    [
            new Datum(
                'smoke',
                DatumType.BOOLEAN,
                true
            ),
            new Datum(
                'smoke_density',
                DatumType.NUMBER,
                true
            )
        ]
    },
    {
        display: 'Smoke (enum status)',
        for:     [SensorType.SMOKE],
        data:    [
            new Datum(
                'smoke',
                DatumType.STRING,
                true
            ),
            new Datum(
                'smoke_value',
                DatumType.NUMBER,
                true
            )
        ]
    }
];
