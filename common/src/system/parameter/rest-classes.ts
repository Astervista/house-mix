import { Allow } from "rest-decorators";

export class SetParameterBody {
    @Allow()
    public value?: unknown;
}
