/**
 * This module contains constants, types and enums regarding the sections of the system regarding how it works.
 *
 * @module
 */
import {DatumOrigin, DatumType, ExportedDatum} from "../mixing/mix/datum";

// noinspection ES6UnusedImports
import type {SystemParameter} from "./parameter/system-parameter";
// noinspection ES6UnusedImports
import type {SystemTimer} from "./timer/system-timer";
// noinspection ES6UnusedImports
import type {DeviceMonitorDevice} from "./device-monitor/device-monitor-device";
// noinspection ES6UnusedImports
import type {Mix} from "../mixing/mix/mix";


/**
 * What part of the system an {@link ExportedDatum|`ExportedDatum`} with {@link ExportedDatum#originName|`origin`} {@link DatumOrigin.SYSTEM|`SYSTEM`} is originating,
 * as possible values for {@link ExportedDatum#originName|`originName`}.
 */
export enum SystemOrigin {
    /** The {@link DatumOrigin.SYSTEM|sytem} {@link ExportedDatum|`ExportedDatum`} comes from a {@link SystemParameter|`SystemParameter`}. */
    PARAMETER     = "PARAMETER",
    /** The {@link DatumOrigin.SYSTEM|sytem} {@link ExportedDatum|`ExportedDatum`} comes from a {@link SystemTimer|`SystemTimer`}. */
    TIMER         = "TIMER",
    /** The {@link DatumOrigin.SYSTEM|sytem} {@link ExportedDatum|`ExportedDatum`} comes from a {@link DeviceMonitorDevice|device} being monitored for its connection to LAN. */
    DEVICE_STATUS = "DEVICE_STATUS",
    /** The {@link DatumOrigin.SYSTEM|sytem} {@link ExportedDatum|`ExportedDatum`} comes from the status of the environment the system is running in, for example time and date. */
    ENVIRONMENT   = "ENVIRONMENT"
}

/**
 * All possible {@link ExportedDatum#name|`ExportedDatum.name`} for an {@link ExportedDatum|`ExportedDatum`} with {@link ExportedDatum#originName|`origin`}
 * {@link DatumOrigin.SYSTEM|`SYSTEM`} and {@link ExportedDatum#originName|`originName`} {@link SystemOrigin.ENVIRONMENT|`ENVIRONMENT`}.
 */
export enum EnvironmentInput {
    /** The environment's time of day. */
    TIME            = "TIME",
    /** The environment's date. */
    DATE            = "DATE",
    /** The environment's date and time of day. */
    DATE_TIME       = "DATE_TIME",
    /** Whether the environment has internet access. */
    INTERNET_ACCESS = "INTERNET_ACCESS"
}

// Double jsDoc because linter doesn't like for it to be before "export", but TypeDoc doesn't notice it if after "export".
/**
 * The list of all {@link ExportedDatum|`ExportedDatum`} with {@link ExportedDatum#originName|`origin`}
 * {@link DatumOrigin.SYSTEM|`SYSTEM`} and {@link ExportedDatum#originName|`originName`}
 * {@link SystemOrigin.ENVIRONMENT|`ENVIRONMENT`} that can be used in a {@link Mix|`Mix`}
 * as an {@link Mix#inputs|input}.
 */
export
/**
 * The list of all {@link ExportedDatum|`ExportedDatum`} with {@link ExportedDatum#originName|`origin`}
 * {@link DatumOrigin.SYSTEM|`SYSTEM`} and {@link ExportedDatum#originName|`originName`}
 * {@link SystemOrigin.ENVIRONMENT|`ENVIRONMENT`} that can be used in a {@link Mix|`Mix`}
 * as an {@link Mix#inputs|input}.
 */
const SYSTEM_ENVIRONMENT_INPUTS: ExportedDatum[] = [
    
    new ExportedDatum(
        EnvironmentInput.TIME,
        DatumType.TIME,
        false,
        DatumOrigin.SYSTEM,
        SystemOrigin.ENVIRONMENT,
        "Current time"
    ),
    new ExportedDatum(
        EnvironmentInput.DATE_TIME,
        DatumType.DATE_TIME,
        false,
        DatumOrigin.SYSTEM,
        SystemOrigin.ENVIRONMENT,
        "Current date + time"
    ),
    new ExportedDatum(
        EnvironmentInput.DATE,
        DatumType.DATE,
        false,
        DatumOrigin.SYSTEM,
        SystemOrigin.ENVIRONMENT,
        "Current date"
    ),
    new ExportedDatum(
        EnvironmentInput.INTERNET_ACCESS,
        DatumType.BOOLEAN,
        true,
        DatumOrigin.SYSTEM,
        SystemOrigin.ENVIRONMENT,
        "Internet connection"
    )

];
