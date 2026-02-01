import {IsNotEmpty, Matches} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "./constants";

export class EntityPathParams {
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string = "";
}
