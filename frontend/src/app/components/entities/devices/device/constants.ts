import {ActuatorType} from '@common/devices/actuator/actuator';
import {SensorType} from '@common/devices/sensor/sensor';
import {Datum, DatumType} from '@common/mixing/mix/datum';

export const ACTUATOR_TYPE_DISPLAY: Record<ActuatorType, string> = {
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

export const ACTUATOR_TYPE_ICON: Record<ActuatorType, string> = {
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

export const SENSOR_TYPE_DISPLAY: Record<SensorType, string> = {
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

export const SENSOR_TYPE_ICON: Record<SensorType, string> = {
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

export interface DeviceLibraryProperty {
    display: string,
    for: (SensorType | ActuatorType)[],
    data: Datum[]
}

export const ACTUATOR_PROPERTIES_LIBRARY: DeviceLibraryProperty[] = [
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

export const SENSOR_PROPERTIES_LIBRARY: DeviceLibraryProperty[] = [
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
                DatumType.NUMBER,
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
