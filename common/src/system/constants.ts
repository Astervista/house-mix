import {DatumOrigin, DatumType, ExportedDatum} from "../mixing/mix/datum";

export enum SystemOrigin {
    PARAMETER = "PARAMETER",
    TIMER         = "TIMER",
    DEVICE_STATUS = "DEVICE_STATUS",
    ENVIRONMENT   = "ENVIRONMENT"
}

export enum EnvironmentInput {
    TIME            = "TIME",
    DATE            = "DATE",
    DATE_TIME       = "DATE_TIME",
    INTERNET_ACCESS = "INTERNET_ACCESS"
}

export const SYSTEM_ENVIRONMENT_INPUTS: ExportedDatum[] = [
    
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
