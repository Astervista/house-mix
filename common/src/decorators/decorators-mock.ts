
function makeFn() {
    return function (..._params: unknown[]): PropertyDecorator {
        return () => {
            /* intentionally empty */
        };
    }
}

export const IsNotEmpty = makeFn();
export const Matches = makeFn();
export const IsPositive = makeFn();
export const IsDefined = makeFn();
export const IsInt = makeFn();
export const ValidateIf = makeFn();
export const IsArray = makeFn();
export const IsOptional = makeFn();
export const Transform = makeFn();
export const Allow = makeFn();
export const Type = makeFn();
export const ValidateNested = makeFn();
export const IsEnum = makeFn();
export const IsBoolean = makeFn();
export const IsString = makeFn();
