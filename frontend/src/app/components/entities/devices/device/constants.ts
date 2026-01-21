import {ActuatorType} from '@common/devices/actuator/actuator';
import { SensorType } from "@common/devices/sensor/sensor";
import {Datum, DatumType} from '@common/mixing/mix/datum';

export const ACTUATOR_TYPE_DISPLAY: Record<ActuatorType, string> = {
    [ActuatorType.BULB]: "Lightbulb",
    [ActuatorType.STRIP]: "Light strip",
    [ActuatorType.UNKNOWN]: "Unknown"
}

export const ACTUATOR_TYPE_ICON: Record<ActuatorType, string> = {
    [ActuatorType.BULB]: "bulb.svg",
    [ActuatorType.STRIP]: "strip.svg",
    [ActuatorType.UNKNOWN]: "unknown.svg"
}

export const SENSOR_TYPE_DISPLAY: Record<SensorType, string> = {
    [SensorType.BUTTON]:  'Button',
    [SensorType.LIGHT]:   'Light sensor',
    [SensorType.UNKNOWN]: 'Unknown',
    [SensorType.ROTARY]:  'Rotary switch'
}

export const SENSOR_TYPE_ICON: Record<SensorType, string> = {
    [SensorType.BUTTON]:  'button.svg',
    [SensorType.LIGHT]:   'light_sensor.svg',
    [SensorType.UNKNOWN]: 'unknown.svg',
    [SensorType.ROTARY]:  'rotary.svg'
}

export const ACTUATOR_PROPERTIES_LIBRARY: {display: string, data: Datum[]}[] = [
    {
        display: "Basic light",
        data: [
            new Datum(
                 "brightness",
                 DatumType.NUMBER,
                 false,
            )
        ]
    },
    {
        display: "Temperature light",
        data: [
            new Datum(
                "brightness",
                DatumType.NUMBER,
                false,
            ),
            new Datum(
                "color_temp",
                DatumType.NUMBER,
                true,
            )
        ]
    }
]

export const SENSOR_PROPERTIES_LIBRARY: {display: string, data: Datum[]}[] = [
    {
        display: "Basic button",
        data: [
            new Datum(
                 "action",
                 DatumType.NUMBER,
                 false,
            )
        ]
    },
    {
        display: "Rotary button",
        data: [
            new Datum(
                "action",
                DatumType.NUMBER,
                false,
            ),
            new Datum(
                "delta",
                DatumType.NUMBER,
                true,
            )
        ]
    }
]
