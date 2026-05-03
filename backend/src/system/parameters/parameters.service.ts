/**
 * This module contains the {@link ParametersService|`ParametersService`} class, handling the business logic for {@link SystemParameter|`SystemParameter`s}.
 *
 * @module
 */
import {BadRequestException, ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {SystemParameter, SystemParameterJSON} from "@common/system/parameter/system-parameter";
import {FileService} from "../../helpers/file/file.service";
import {MixService} from "../../mixing/mix/mix.service";
import {Datum, DatumOrigin} from "@common/mixing/mix/datum";
import {SystemOrigin} from "@common/system/constants";
import {EngineService} from "../../engine/engine.service";

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';


/**
 * The path of the file where to save the data about the {@link ParametersService|`ParametersService`}.
 */
const SAVE_FILE = "system/parameters.json";

/**
 * This service handles the business logic for {@link SystemParameter|`SystemParameter`s}.
 *
 * System parameters are values that can be {@link Mix#imports|imported} in a {@link Mix|`Mix`} and have
 * the same value throughout the system.
 *
 * This service handles the functions to create, edit, delete and assign values to {@link SystemParameter|`SystemParameter`s},
 * and notifies the {@link EngineService|`EngineService`} to request a recalculation when the values change.
 */
@Injectable()
export class ParametersService extends PersistentDataService<ParameterData, ParameterDataJSON>{
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {FileService} fileService - The service handling persistent storage. Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} business logic. Instantiated by dependency injection.
     * @param {EngineService} engineService - The service responsible for the mixing engine execution. Instantiated by dependency injection.
     */
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService,
        @Inject(forwardRef(() => EngineService))
        private engineService: EngineService
    ) {
        super(fileService, SAVE_FILE, ParameterData);
    }
    
    /**
     * Get all {@link SystemParameter|`SystemParameter`s} in the system.
     *
     * @returns {Promise<SystemParameter[]>} An array containing the resulting {@link SystemParameter|`SystemParameter`s}.
     */
    public async getAllParameters(): Promise<SystemParameter[]> {
        const data = await this.data;
        return data.parameters.slice();
    }
    
    /**
     * Adds a new {@link SystemParameter|`SystemParameter`} to the system.
     *
     * @param {SystemParameter} parameter - The {@link SystemParameter|`SystemParameter`} to add.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a parameter with the same name already exists.
     */
    public async createParameter(parameter: SystemParameter): Promise<void> {
        const data = await this.data;
        const alreadyExists = data.parameters.some(otherParam => otherParam.name == parameter.name);
        if (alreadyExists) {
            throw new ConflictException("Parameter already exists");
        }
        data.parameters.push(parameter);
        this.saveData();
    }
    
    /**
     * Removes a {@link SystemParameter|`SystemParameter`} from the system by its name.
     *
     * @param {string} name - The name of the parameter to remove.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the parameter is used in a mix.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     */
    public async deleteParameter(name: string): Promise<void> {
        const data = await this.data;
        const parameterToDelete = data.parameters.find(otherParam => otherParam.name === name);
        if (parameterToDelete == null) {
            throw new NotFoundException("Parameter does not exist");
        }
        if (await this.mixService.dependencyExists(DatumOrigin.SYSTEM, SystemOrigin.PARAMETER, name)) {
            throw new ConflictException("Cannot delete the parameter, it's used in a mix");
        }
        const toDeleteIndex = data.parameters.indexOf(parameterToDelete);
        if (toDeleteIndex !== -1) {
            data.parameters.splice(toDeleteIndex, 1);
        }
        this.saveData();
    }
    
    /**
     * Gets the value of a {@link SystemParameter|`SystemParameter`}.
     *
     * @param {string} parameterName - The name of the parameter.
     * @returns {Promise<unknown>} The current value of the parameter.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     */
    public async getValue(parameterName: string): Promise<unknown> {
        const data = await this.data;
        const parameter = data.parameters.find(otherParam => otherParam.name === parameterName);
        if (parameter == null) {
            throw new NotFoundException("Parameter does not exist");
        }
        return Datum.valueToJSON(parameter.value, parameter.datum.type);
    }
    
    /**
     * Sets the value of a {@link SystemParameter|`SystemParameter`}.
     *
     * @param {string} parameterName - The name of the parameter to update.
     * @param {unknown} value - The new value.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the provided value is not valid for the chosen parameter.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link SystemParameter|`SystemParameter`} was found with the specific name.
     */
    public async setValue(parameterName: string, value: unknown): Promise<void> {
        const data = await this.data;
        const parameter = data.parameters.find(otherParam => otherParam.name === parameterName);
        if (parameter == null) {
            throw new NotFoundException("Parameter does not exist");
        }
        value = Datum.valueFromJSON(value, parameter.datum.type);
        if (!parameter.datum.checkValue(value)) {
            throw new BadRequestException("The provided value is not valid for the chosen parameter")
        }
        parameter.value = value;
        this.engineService.requestRecalculation();
        this.saveData();
    }
}

/**
 * The persistent data structure used by {@link ParametersService|`ParametersService`}
 * for persisting data about the {@link SystemParameter|`SystemParameter`s}.
 */
export class ParameterData {
    
    /**
     * The list of system parameters.
     */
    public parameters: SystemParameter[];
    
    /**
     * Creates an instance of the class from its serialization.
     *
     * @param {ParameterDataJSON} parameterDataJSON - The serialization of the class to recreate into an instance of the class.
     */
    constructor(parameterDataJSON?: ParameterDataJSON) {
        if (parameterDataJSON) {
            this.parameters = parameterDataJSON.parameters.map((parameter: SystemParameterJSON) => SystemParameter.fromJSON(parameter));
        } else {
            this.parameters = [];
        }
    }
    
    /**
     * Converts the parameter data instance into its JSON representation.
     *
     * @returns {ParameterDataJSON} The JSON representation of `this`.
     */
    public toJSON(): ParameterDataJSON {
        return {
            parameters: this.parameters.map((parameter: SystemParameter) => parameter.toJSON())
        };
    }
}

/**
 * The serialization of the class {@link ParameterData|`ParameterData`}.
 */
export interface ParameterDataJSON {
    /**
     * Serialization of the property {@link ParameterData#parameters|`parameters`}.
     */
    parameters: SystemParameterJSON[];
}
