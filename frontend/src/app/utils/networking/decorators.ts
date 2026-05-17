/**
 * This module defines decorators for the usual HTTP methods, and helper function. An HTTP method
 * decorator adds the fetch functionality to a decorated method only by defining the data handled
 * by the request and its configuration, without the need for any code.
 *
 * @module
 */
import {HttpClient, HttpParams} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {API_ENDPOINT} from '../constants';


/**
 * A serializable value, either a class with a `toJSON()` method, an array of such classes,
 * an already serialized class, a primitive value, a null value or an undefined value.
 *
 * @template R - The corresponding serialized class.
 */
export type Serializable<R> = Serializable<R>[]
    | {
        /**
         * The serializing function.
         *
         * @returns {R} The serialized representation of `this`.
         */
        toJSON?: () => R
    }
    | R
    | null
    | undefined
    | number
    | string

/**
 * Serializes a {@link Serializable|`Serializable`} value, depending on its type.
 *
 * @param {Serializable<R>} value - The value to serialize.
 * @returns {R} The serialized representation of `value`.
 * @template R - The type of the serialized value.
 */
function serialize<R>(value: Serializable<R>): R {
    if (value == null) {
        return null as R;
    }
    if (typeof value != 'object') {
        return value as R;
    }
    if (value instanceof Array) {
        return value.map(element => serialize(element)) as R;
    }
    if ('toJSON' in value && value.toJSON != null && value.toJSON instanceof Function) {
        return value.toJSON();
    }
    return value as R;
}

/** @ignore */
const apiEndpointCorrect = API_ENDPOINT.replace(/\/+$/g, '');

/**
 * Decorator that assigns to a class a base path, to be used as a prefix to all the paths of HTTP requests
 * performed by a {@link HttpRequestDecorator|`HttpRequestDecorator`}.
 *
 * @param {string} path - The path to be prefixed to all the requests in the class.
 * @returns {(constructor: Function) => void} - The decorating function.
 */
export function BasePath(path: string) {

    path = path.replace(/\/+$/g, '');
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    return (constructor: Function): void => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/dot-notation
        constructor.prototype['__basePath'] = path;
    };

}

/**
 * Serialize a value passed as a Url parameter into a string, is possible.
 * The `toString` method is used for objects, and undefined values are never serializable.
 *
 * @param {unknown} value - The value to serialize.
 * @returns {string} - The string representation of `value`.
 * @throws {Error} If the value is not serializable into a string, or an `undefined` value was passed.
 */
function serializeUrlParam(value: unknown): string {
    switch (typeof value) {
        case 'undefined':
            throw new Error(`Missing parameter`);
        case 'object':
            if (value == null) {
                return "null"
            }
            if (typeof value.toString == 'function') {
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                return value.toString();
            } else {
                throw new Error(`Not serializable`);
            }
        case 'boolean':
        case 'number':
        case 'bigint':
            return `${value}`;
        case 'string':
            return value;
        case 'function':
        case 'symbol':
        default:
            throw new Error(`Not serializable`);
    }
}


/**
 * The options for a {@link Get|`Get`} decorator, to customize its behavior.
 *
 * @template R - The response body's class type.
 * @notExported
 */
interface GetOptions<R> {
    /** The class contained in the body of the response. If the class contains a `fromJson()` method, it will be used for deserialization of the result. */
    result: {
        /** The class must be of the declared template type `T`. */
        prototype: R
    };
    /** Whether the response body contains an array of {@link GetOptions#result|`result`s} or just the one instance. */
    resultIsArray?: boolean;
    /** Custom parameters to attach to the request. */
    httpParams?: HttpParams;
    /** Optional query parameters to attach to the request. The structure is an object with the property names as the query parameter names, and as values a boolean value that indicates if the parameter is required or not. */
    queryParams?: Record<string, boolean>
}

/**
 * The {@link HttpRequestDecorator|`HttpRequestDecorator`} for the `GET` method.
 *
 * This decorator works as described in {@link HttpRequestDecorator|`HttpRequestDecorator`}, but never receives a body.
 * The template variable is therefore just one, `T`, the result class type that can never be `null`.
 *
 * @param {string} path - The resource path for this request.
 * @param {GetOptions<R>} options - The {@link GetOptions|`GetOptions`} for this request.
 * @returns {(target: unknown, propertyKey: string) => void} - The decorating function.
 * @template R - The response body's class type. Can't be `null`.
 * @example An example of use
 *
 * Remember:
 * - the body is never specified,
 * - the return class can never be `null`,
 * - usually, responses also provide an array of elements instead of a single element. In these cases, the
 *   return type is the element's class, without the array. The array nature of the result is expressed using
 *   the `options` parameter.
 *
 * ```typescript
 * class HttpRequests {
 *
 *     @Get<ResultClass>(
 *         "/resource/",
 *         {
 *             result: ResultClass,
 *             resultIsArray: true,
 *             queryParams: {
 *                 optional: false,
 *             }
 *         }
 *     )
 *     public getSomething!: (
 *                             queryValues?: {
 *                                                optional?: string
 *                                           }
 *                           ) => Promise<ResultClass[]>;
 * }
 * ```
 */
export function Get<R>(path: string, options: GetOptions<R>) {

    path = path.replace(/\/+$/g, '');
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    const pieces = path
        .split('/')
        .map(a => {
            if (a.startsWith(':')) {
                return {
                    param: true,
                    name:  a.substring(1)
                };
            } else {
                return {
                    param: false,
                    name:  a
                };
            }
        });

    const hasPathParams = pieces.some(a => a.param);

    const queryParamEntries = Object.entries(options.queryParams ?? {});

    return function (
        target: unknown,
        propertyKey: string
    ): void {
        const fn = function (this: { httpClient?: HttpClient }, ...params: Record<string, unknown>[]): Promise<R | R[]> {

            let pathParams: Record<string, unknown> = {};
            let queryParams: Record<string, unknown> = {};

            if (hasPathParams) {
                pathParams = params[0] ?? {};
                queryParams = params[1] ?? {};
            } else {
                queryParams = params[0] ?? {};
            }

            const requestPieces = pieces
                .map(a => {
                    if (a.param) {
                        const value = pathParams[a.name];
                        if (value == null) {
                            throw new Error(`Missing path parameter ${a.name}`);
                        } else {
                            try {
                                return serializeUrlParam(value)
                            } catch (e: unknown) {
                                if (e instanceof Error) {
                                    if (e.message == "Missing parameter") {
                                        throw new Error(`Missing path parameter ${a.name}`);
                                    } else {
                                        throw new Error(`Path parameter ${a.name} is not serializable`);
                                    }
                                }
                                throw e;
                            }
                        }
                    } else {
                        return a.name;
                    }
                })
                .map(a => encodeURIComponent(a));

            const compiledQueryParams: {name: string, value: string}[] = [];

            for (const [paramName, paramRequired] of queryParamEntries) {
                const value = queryParams[paramName];
                if (value === undefined) {
                    if (paramRequired) {
                        throw new Error(`Missing query parameter ${paramName}`)
                    }
                } else {
                    compiledQueryParams.push({name: paramName, value: encodeURIComponent(serializeUrlParam(value))});
                }
            }

            const constructedPath = requestPieces.join('/');
            let url: string;
            const prototype: { __basePath?: string } = Object.getPrototypeOf(this) as { __basePath?: string };
            if (typeof prototype.__basePath == 'string') {
                url = apiEndpointCorrect + prototype.__basePath + constructedPath;
            } else {
                url = apiEndpointCorrect + constructedPath;
            }

            if (compiledQueryParams.length > 0) {
                url += '?';
                url += compiledQueryParams.map(a => `${a.name}=${a.value}`).join('&');
            }

            if ('fromJSON' in options.result && options.result.fromJSON instanceof Function) {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Get directive to a service, component or simply a class, the class that it\'s attached to needs to have an HttpClient instance defined as property httpClient');
                }
                const fromJSONFunction = options.result.fromJSON as (value: unknown) => R;
                return firstValueFrom(
                    this.httpClient.get<unknown>(
                        url,
                        {params: options.httpParams}
                    )
                )
                    .then((result) => {
                        if (options.resultIsArray == true) {
                            return (result as R[]).map(el => fromJSONFunction(el));
                        } else {
                            return fromJSONFunction(result);
                        }
                    });
            } else {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Get directive to a service, component or simply a class, the class that it\'s attached to needs to have an HttpClient instance defined as property httpClient');
                }
                return firstValueFrom(
                    this.httpClient.get<R>(
                        url,
                        {params: options.httpParams}
                    )
                );
            }
        };

        Object.defineProperty(target, propertyKey, {
            configurable: true,
            enumerable:   true,
            writable:     true,
            value:        fn
        });
    };
}

/**
 * The options for a {@link Post|`Post`} decorator, to customize its behavior.
 *
 * @template R - The response body's class type.
 * @notExported
 */
interface PostOptions<R> {
    /** The class of type `R` contained in the body of the response. If the class contains a `fromJson()` method, it will be used for deserialization of the result. */
    result?: (new (...args: never[]) => R) | null;
    /** Whether the response body contains an array of {@link PostOptions#result|`result`s} or just the one instance. */
    resultIsArray?: boolean;
    /** Custom parameters to attach to the request. */
    httpParams?: HttpParams;
    /** Optional query parameters to attach to the request. The structure is an object with the property names as the query parameter names, and as values a boolean value that indicates if the parameter is required or not. */
    queryParams?: Record<string, boolean>
}


/**
 * The {@link HttpRequestDecorator|`HttpRequestDecorator`} for the `POST` method.
 *
 * This decorator works as described in {@link HttpRequestDecorator|`HttpRequestDecorator`}.
 *
 * @param {string} path - The resource path for this request.
 * @param {PostOptions<R>} options - The {@link PostOptions|`PostOptions`} for this request.
 * @returns {(target: unknown, propertyKey: string) => void} - The decorating function.
 * @template B - The request body's class type. Can't be `null`.
 * @template R - The response body's class type. Can be `null`.
 * @example An example of use
 *
 * Remember:
 * - teh body class can never be `null`,
 * - the return class can be `null`, and this translates to a return type of {@link Promise|`Promise`}`<void>`.
 *
 * ```typescript
 * class HttpRequests {
 *
 *     @Post<BodyClass, null>(
 *         "/resource/:id/"
 *     )
 *     public postSomething!: (
 *                              body: BodyClass,
 *                              pathValues: {
 *                                              id: string
 *                                          }
 *                            ) => Promise<void>;
 * }
 * ```
 */
export function Post<B, R>(path: string, options?: PostOptions<R>) {

    path = path.replace(/\/+$/g, '');
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    const pieces = path
        .split('/')
        .map(a => {
            if (a.startsWith(':')) {
                return {
                    param: true,
                    name:  a.substring(1)
                };
            } else {
                return {
                    param: false,
                    name:  a
                };
            }
        });

    const hasPathParams = pieces.some(a => a.param);

    const queryParamEntries = Object.entries(options?.queryParams ?? {});

    return function (
        target: unknown,
        propertyKey: string
    ): void {
        const fn = function (this: { httpClient?: HttpClient }, body: B, ...params: Record<string, unknown>[]): Promise<R | R[]> {

            let pathParams: Record<string, unknown> = {};
            let queryParams: Record<string, unknown> = {};

            if (hasPathParams) {
                pathParams = params[0] ?? {};
                queryParams = params[1] ?? {};
            } else {
                queryParams = params[0] ?? {};
            }

            const requestPieces = pieces
                .map(a => {
                    if (a.param) {
                        const value = pathParams[a.name];
                        if (value == null) {
                            throw new Error(`Missing path parameter ${a.name}`);
                        } else {
                            try {
                                return serializeUrlParam(value)
                            } catch (e: unknown) {
                                if (e instanceof Error) {
                                    if (e.message == "Missing parameter") {
                                        throw new Error(`Missing path parameter ${a.name}`);
                                    } else {
                                        throw new Error(`Path parameter ${a.name} is not serializable`);
                                    }
                                }
                                throw e;
                            }
                        }
                    } else {
                        return a.name;
                    }
                })
                .map(a => encodeURIComponent(a));

            const compiledQueryParams: {name: string, value: string}[] = [];

            for (const [paramName, paramRequired] of queryParamEntries) {
                const value = queryParams[paramName];
                if (value == null) {
                    if (paramRequired) {
                        throw new Error(`Missing query parameter ${paramName}`)
                    }
                } else {
                    compiledQueryParams.push({name: paramName, value: encodeURIComponent(serializeUrlParam(value))});
                }
            }

            const constructedPath = requestPieces.join('/');
            let url: string;
            const prototype: { __basePath?: string } = Object.getPrototypeOf(this) as { __basePath?: string };
            if (typeof prototype.__basePath == 'string') {
                url = apiEndpointCorrect + prototype.__basePath + constructedPath;
            } else {
                url = apiEndpointCorrect + constructedPath;
            }

            if (compiledQueryParams.length > 0) {
                url += '?';
                url += compiledQueryParams.map(a => `${a.name}=${a.value}`).join('&');
            }

            if (options?.result != null && 'fromJSON' in options.result && options.result.fromJSON instanceof Function) {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Put directive to a service, component or simply a class, it must contain a ');
                }
                const fromJSONFunction = options.result.fromJSON as (value: unknown) => R;
                return firstValueFrom(
                    this.httpClient.post<unknown>(
                        url,
                        serialize(body),
                        {params: options.httpParams}
                    )
                )
                    .then((result) => {
                        if (options.resultIsArray == true) {
                            return (result as R[]).map(el => fromJSONFunction(el));
                        } else {
                            return fromJSONFunction(result);
                        }
                    });
            } else {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Put directive to a service, component or simply a class, it must contain a ');
                }
                return firstValueFrom(
                    this.httpClient.post<R>(
                        url,
                        serialize(body),
                        {params: options?.httpParams}
                    )
                );
            }
        };

        Object.defineProperty(target, propertyKey, {
            configurable: true,
            enumerable:   true,
            writable:     true,
            value:        fn
        });
    };
}


/**
 * The options for a {@link Put|`Put`} decorator, to customize its behavior.
 *
 * @template R - The response body's class type.
 * @notExported
 */
interface PutOptions<R> {
    /** The class of type `R` contained in the body of the response. If the class contains a `fromJson()` method, it will be used for deserialization of the result. */
    result?: (new (...args: never[]) => R) | null;
    /** Whether the response body contains an array of {@link PutOptions#result|`result`s} or just the one instance. */
    resultIsArray?: boolean;
    /** Custom parameters to attach to the request. */
    httpParams?: HttpParams;
    /** Optional query parameters to attach to the request. The structure is an object with the property names as the query parameter names, and as values a boolean value that indicates if the parameter is required or not. */
    queryParams?: Record<string, boolean>
}

/**
 * The {@link HttpRequestDecorator|`HttpRequestDecorator`} for the `PUT` method.
 *
 * This decorator works as described in {@link HttpRequestDecorator|`HttpRequestDecorator`}.
 *
 * @param {string} path - The resource path for this request.
 * @param {PutOptions<R>} options - The {@link PutOptions|`PutOptions`} for this request.
 * @returns {(target: unknown, propertyKey: string) => void} - The decorating function.
 * @template B - The request body's class type. Can't be `null`.
 * @template R - The response body's class type. Can be `null`.
 * @example An example of use
 *
 * Remember:
 * - teh body class can never be `null`,
 * - the return class can be `null`, and this translates to a return type of {@link Promise|`Promise`}`<void>`.
 *
 * ```typescript
 * class HttpRequests {
 *
 *     @Put<BodyClass, ResultClass>(
 *         "/resource/:id/"
 *     )
 *     public putSomething!: (
 *                             body: BodyClass,
 *                             pathValues: {
 *                                             id: string
 *                                         }
 *                           ) => Promise<ResultClass>;
 * }
 * ```
 */
export function Put<B, R>(path: string, options?: PutOptions<R>) {

    path = path.replace(/\/+$/g, '');
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    const pieces = path
        .split('/')
        .map(a => {
            if (a.startsWith(':')) {
                return {
                    param: true,
                    name:  a.substring(1)
                };
            } else {
                return {
                    param: false,
                    name:  a
                };
            }
        });

    const hasPathParams = pieces.some(a => a.param);

    const queryParamEntries = Object.entries(options?.queryParams ?? {});

    return function (
        target: unknown,
        propertyKey: string
    ): void {
        const fn = function (this: { httpClient?: HttpClient }, body: B, ...params: Record<string, unknown>[]): Promise<R | R[]> {

            let pathParams: Record<string, unknown> = {};
            let queryParams: Record<string, unknown> = {};

            if (hasPathParams) {
                pathParams = params[0] ?? {};
                queryParams = params[1] ?? {};
            } else {
                queryParams = params[0] ?? {};
            }

            const requestPieces = pieces
                .map(a => {
                    if (a.param) {
                        const value = pathParams[a.name];
                        if (value == null) {
                            throw new Error(`Missing path parameter ${a.name}`);
                        } else {
                            try {
                                return serializeUrlParam(value)
                            } catch (e: unknown) {
                                if (e instanceof Error) {
                                    if (e.message == "Missing parameter") {
                                        throw new Error(`Missing path parameter ${a.name}`);
                                    } else {
                                        throw new Error(`Path parameter ${a.name} is not serializable`);
                                    }
                                }
                                throw e;
                            }
                        }
                    } else {
                        return a.name;
                    }
                })
                .map(a => encodeURIComponent(a));

            const compiledQueryParams: {name: string, value: string}[] = [];

            for (const [paramName, paramRequired] of queryParamEntries) {
                const value = queryParams[paramName];
                if (value == null) {
                    if (paramRequired) {
                        throw new Error(`Missing query parameter ${paramName}`)
                    }
                } else {
                    compiledQueryParams.push({name: paramName, value: encodeURIComponent(serializeUrlParam(value))});
                }
            }

            const constructedPath = requestPieces.join('/');
            let url: string;
            const prototype: { __basePath?: string } = Object.getPrototypeOf(this) as { __basePath?: string };
            if (typeof prototype.__basePath == 'string') {
                url = apiEndpointCorrect + prototype.__basePath + constructedPath;
            } else {
                url = apiEndpointCorrect + constructedPath;
            }

            if (compiledQueryParams.length > 0) {
                url += '?';
                url += compiledQueryParams.map(a => `${a.name}=${a.value}`).join('&');
            }

            if (options?.result != null && 'fromJSON' in options.result && options.result.fromJSON instanceof Function) {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Put directive to a service, component or simply a class, it must contain a ');
                }
                const fromJSONFunction = options.result.fromJSON as (value: unknown) => R;
                return firstValueFrom(
                    this.httpClient.put<unknown>(
                        url,
                        serialize(body),
                        {params: options.httpParams}
                    )
                )
                    .then((result) => {
                        if (options.resultIsArray == true) {
                            return (result as R[]).map(el => fromJSONFunction(el));
                        } else {
                            return fromJSONFunction(result);
                        }
                    });
            } else {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Put directive to a service, component or simply a class, it must contain a ');
                }
                return firstValueFrom(
                    this.httpClient.put<R>(
                        url,
                        serialize(body),
                        {params: options?.httpParams}
                    )
                );
            }
        };

        Object.defineProperty(target, propertyKey, {
            configurable: true,
            enumerable:   true,
            writable:     true,
            value:        fn
        });
    };
}


/**
 * The options for a {@link Patch|`Patch`} decorator, to customize its behavior.
 *
 * @template R - The response body's class type.
 * @notExported
 */
interface PatchOptions<R> {
    /** The class of type `R` contained in the body of the response. If the class contains a `fromJson()` method, it will be used for deserialization of the result. */
    result?: (new (...args: never[]) => R) | null;
    /** Whether the response body contains an array of {@link PatchOptions#result|`result`s} or just the one instance. */
    resultIsArray?: boolean;
    /** Custom parameters to attach to the request. */
    httpParams?: HttpParams;
    /** Optional query parameters to attach to the request. The structure is an object with the property names as the query parameter names, and as values a boolean value that indicates if the parameter is required or not. */
    queryParams?: Record<string, boolean>

}

/**
 * The {@link HttpRequestDecorator|`HttpRequestDecorator`} for the `PATCH` method.
 *
 * This decorator works as described in {@link HttpRequestDecorator|`HttpRequestDecorator`}.
 *
 * @param {string} path - The resource path for this request.
 * @param {PatchOptions<R>} options - The {@link PatchOptions|`PatchOptions`} for this request.
 * @returns {(target: unknown, propertyKey: string) => void} - The decorating function.
 * @template B - The request body's class type. Can't be `null`.
 * @template R - The response body's class type. Can be `null`.
 * @example An example of use
 *
 * Remember:
 * - teh body class can never be `null`,
 * - the return class can be `null`, and this translates to a return type of {@link Promise|`Promise`}`<void>`.
 *
 * ```typescript
 * class HttpRequests {
 *
 *     @Patch<BodyClass, ReturnClass>(
 *         "/resource/:id/"
 *         {
 *             resultIsArray: true,
 *             queryParams: {
 *                 optional: false,
 *             }
 *         }
 *     )
 *     public patchSomething!: (
 *                               body: BodyClass,
 *                               pathValues: {
 *                                                id: string
 *                                           },
 *                               queryValues?: {
 *                                                  optional?: string
 *                                             }
 *                             ) => Promise<ReturnClass[]>;
 * }
 * ```
 */
export function Patch<B, R>(path: string, options?: PatchOptions<R>) {

    path = path.replace(/\/+$/g, '');
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    const pieces = path
        .split('/')
        .map(a => {
            if (a.startsWith(':')) {
                return {
                    param: true,
                    name:  a.substring(1)
                };
            } else {
                return {
                    param: false,
                    name:  a
                };
            }
        });

    const hasPathParams = pieces.some(a => a.param);

    const queryParamEntries = Object.entries(options?.queryParams ?? {});

    return function (
        target: unknown,
        propertyKey: string
    ): void {
        const fn = function (this: { httpClient?: HttpClient }, body: B, ...params: Record<string, unknown>[]): Promise<R | R[]> {

            let pathParams: Record<string, unknown> = {};
            let queryParams: Record<string, unknown> = {};

            if (hasPathParams) {
                pathParams = params[0] ?? {};
                queryParams = params[1] ?? {};
            } else {
                queryParams = params[0] ?? {};
            }

            const requestPieces = pieces
                .map(a => {
                    if (a.param) {
                        const value = pathParams[a.name];
                        if (value == null) {
                            throw new Error(`Missing path parameter ${a.name}`);
                        } else {
                            try {
                                return serializeUrlParam(value)
                            } catch (e: unknown) {
                                if (e instanceof Error) {
                                    if (e.message == "Missing parameter") {
                                        throw new Error(`Missing path parameter ${a.name}`);
                                    } else {
                                        throw new Error(`Path parameter ${a.name} is not serializable`);
                                    }
                                }
                                throw e;
                            }
                        }
                    } else {
                        return a.name;
                    }
                })
                .map(a => encodeURIComponent(a));

            const compiledQueryParams: {name: string, value: string}[] = [];

            for (const [paramName, paramRequired] of queryParamEntries) {
                const value = queryParams[paramName];
                if (value == null) {
                    if (paramRequired) {
                        throw new Error(`Missing query parameter ${paramName}`)
                    }
                } else {
                    compiledQueryParams.push({name: paramName, value: encodeURIComponent(serializeUrlParam(value))});
                }
            }

            const constructedPath = requestPieces.join('/');
            let url: string;
            const prototype: { __basePath?: string } = Object.getPrototypeOf(this) as { __basePath?: string };
            if (typeof prototype.__basePath == 'string') {
                url = apiEndpointCorrect + prototype.__basePath + constructedPath;
            } else {
                url = apiEndpointCorrect + constructedPath;
            }

            if (compiledQueryParams.length > 0) {
                url += '?';
                url += compiledQueryParams.map(a => `${a.name}=${a.value}`).join('&');
            }

            if (options?.result != null && 'fromJSON' in options.result && options.result.fromJSON instanceof Function) {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Patch directive to a service, component or simply a class, it must contain a ');
                }
                const fromJSONFunction = options.result.fromJSON as (value: unknown) => R;
                return firstValueFrom(
                    this.httpClient.patch<unknown>(
                        url,
                        serialize(body),
                        {params: options.httpParams}
                    )
                )
                    .then((result) => {
                        if (options.resultIsArray == true) {
                            return (result as R[]).map(el => fromJSONFunction(el));
                        } else {
                            return fromJSONFunction(result);
                        }
                    });
            } else {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Patch directive to a service, component or simply a class, it must contain a ');
                }
                return firstValueFrom(
                    this.httpClient.patch<R>(
                        url,
                        serialize(body),
                        {params: options?.httpParams}
                    )
                );
            }
        };

        Object.defineProperty(target, propertyKey, {
            configurable: true,
            enumerable:   true,
            writable:     true,
            value:        fn
        });
    };
}


/**
 * The options for a {@link Delete|`Delete`} decorator, to customize its behavior.
 *
 * @template R - The response body's class type.
 * @notExported
 */
interface DeleteOptions<R> {
    /** The class of type `R` contained in the body of the response. If the class contains a `fromJson()` method, it will be used for deserialization of the result. */
    result?: (new (...args: never[]) => R) | null;
    /** Whether the response body contains an array of {@link DeleteOptions#result|`result`s} or just the one instance. */
    resultIsArray?: boolean;
    /** Custom parameters to attach to the request. */
    httpParams?: HttpParams;
    /** Optional query parameters to attach to the request. The structure is an object with the property names as the query parameter names, and as values a boolean value that indicates if the parameter is required or not. */
    queryParams?: Record<string, boolean>,
    /** Whether a body is required for the function. */
    hasBody?: boolean
}

/**
 * The {@link HttpRequestDecorator|`HttpRequestDecorator`} for the `DELETE` method.
 *
 * This decorator works as described in {@link HttpRequestDecorator|`HttpRequestDecorator`}.
 *
 * @param {string} path - The resource path for this request.
 * @param {DeleteOptions<R>} options - The {@link DeleteOptions|`DeleteOptions`} for this request.
 * @returns {(target: unknown, propertyKey: string) => void} - The decorating function.
 * @template B - The request body's class type. Can be `null`.
 * @template R - The response body's class type. Can be `null`.
 * @example An example of use
 *
 * Remember:
 * - the body class can be `null`, and in such case the `body` parameter of the decorated function is omitted.
 * - the return class can be `null`, and this translates to a return type of {@link Promise|`Promise`}`<void>`.
 *
 * ```typescript
 * class HttpRequests {
 *
 *     @Delete<null, ReturnClass>(
 *         "/resource/:id/"
 *         {
 *             resultIsArray: true,
 *             queryParams: {
 *                 optional: false,
 *             }
 *         }
 *     )
 *     public deleteSomething!: (
 *                                pathValues: {
 *                                                id: string
 *                                            },
 *                                queryValues?: {
 *                                                    optional?: string
 *                                              }
 *                              ) => Promise<ReturnClass[]>;
 * }
 * ```
 */
export function Delete<B, R>(path: string, options?: DeleteOptions<R>) {

    path = path.replace(/\/+$/g, '');
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    const pieces = path
        .split('/')
        .map(a => {
            if (a.startsWith(':')) {
                return {
                    param: true,
                    name:  a.substring(1)
                };
            } else {
                return {
                    param: false,
                    name:  a
                };
            }
        });

    const hasPathParams = pieces.some(a => a.param);

    const queryParamEntries = Object.entries(options?.queryParams ?? {});

    return  function (
        target: unknown,
        propertyKey: string
    ): void {
        const fn = function (this: { httpClient?: HttpClient }, body: B | null, ...params: Record<string, unknown>[]): Promise<R | R[]> {

            let pathParams: Record<string, unknown> = {};
            let queryParams: Record<string, unknown> = {};

            if (hasPathParams) {
                pathParams = params[0] ?? {};
                queryParams = params[1] ?? {};
            } else {
                queryParams = params[0] ?? {};
            }

            const requestPieces = pieces
                .map(a => {
                    if (a.param) {
                        const value = pathParams[a.name];
                        if (value == null) {
                            throw new Error(`Missing path parameter ${a.name}`);
                        } else {
                            try {
                                return serializeUrlParam(value)
                            } catch (e: unknown) {
                                if (e instanceof Error) {
                                    if (e.message == "Missing parameter") {
                                        throw new Error(`Missing path parameter ${a.name}`);
                                    } else {
                                        throw new Error(`Path parameter ${a.name} is not serializable`);
                                    }
                                }
                                throw e;
                            }
                        }
                    } else {
                        return a.name;
                    }
                })
                .map(a => encodeURIComponent(a));

            const compiledQueryParams: {name: string, value: string}[] = [];

            for (const [paramName, paramRequired] of queryParamEntries) {
                const value = queryParams[paramName];
                if (value == null) {
                    if (paramRequired) {
                        throw new Error(`Missing query parameter ${paramName}`)
                    }
                } else {
                    compiledQueryParams.push({name: paramName, value: encodeURIComponent(serializeUrlParam(value))});
                }
            }

            const constructedPath = requestPieces.join('/');
            let url: string;
            const prototype: { __basePath?: string } = Object.getPrototypeOf(this) as { __basePath?: string };
            if (typeof prototype.__basePath == 'string') {
                url = apiEndpointCorrect + prototype.__basePath + constructedPath;
            } else {
                url = apiEndpointCorrect + constructedPath;
            }

            if (compiledQueryParams.length > 0) {
                url += '?';
                url += compiledQueryParams.map(a => `${a.name}=${a.value}`).join('&');
            }

            if (options?.result != null && 'fromJSON' in options.result && options.result.fromJSON instanceof Function) {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Delete directive to a service, component or simply a class, it must contain a ');
                }
                const fromJSONFunction = options.result.fromJSON as (value: unknown) => R;
                return firstValueFrom(
                    this.httpClient.delete<unknown>(
                        url,
                        {
                            body: serialize(body),
                            params: options.httpParams
                        }
                    )
                )
                    .then((result) => {
                        if (options.resultIsArray == true) {
                            return (result as R[]).map(el => fromJSONFunction(el));
                        } else {
                            return fromJSONFunction(result);
                        }
                    });
            } else {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Delete directive to a service, component or simply a class, it must contain a ');
                }
                return firstValueFrom(
                    this.httpClient.delete<R>(
                        url,
                        {
                            params: options?.httpParams,
                            body:   serialize(body)
                        }
                    )
                );
            }
        };

        if (options?.hasBody == true) {
            Object.defineProperty(target, propertyKey, {
                configurable: true,
                enumerable:   true,
                writable:     true,
                value:        fn
            });
        } else {
            Object.defineProperty(target, propertyKey, {
                configurable: true,
                enumerable:   true,
                writable:     true,
                value: function (this: { httpClient?: HttpClient }, ...params: Record<string, unknown>[]){ return  fn.bind(this)(null, ...params) }
            });
        }
    };

}

/**
 * An HTTP method decorator that adds the fetch functionality to a decorated method only by defining the data handled
 * by the request and its configuration, without the need for any code.
 *
 * N.B. To work properly, the class containing the decorated method must have a property called `httpClient` of the form {@link HttpClient|`HttpClient`},
 *      correctly instantiated, which will be used for the requests. It doesn't really matter if the type is exactly {@link HttpClient|`HttpClient`}
 *      as long as it exposes the same http method funcitons.
 *
 * HTTP method decorator functions take two parameters:
 * - a `path` string, defining the path to the resource that needs to be fetched. Paths can also contain path parameters in the form `"/:paramName/"`,
 * - an `option` object, containing information on the types involved in the request, and additional parameters.
 *
 * They may also require any of the following template types that sometimes can be chosen to be `null` if not needed:
 * - a `BodyClass` (`<B>`) template parameter that defines the type of the request's body,
 * - a `ResultClass` (`<R>`) template parameter that defines the type of the response's body.
 *
 * The decorator function can then be used to decorate a function property in a class with a signature compatible with
 * the options provided, and the decorator will handle its definition.
 *
 * The decorated function to be compatible with the definition must have the following parameters (in this order):
 * - `body`: only if a `BodyClass` is required by the method and not chosen to be null,
 * - `pathValues`: only if at least one path parameter is defined in the `path`,
 * - `queryValues`: only if `queryParam` is defined in the `options`.
 *
 * The decorated function to be compatible with the definition must also return a {@link Promise|`Promise`} containing a
 * `ResultClass` object (or returning `void` if `ResultClass` is not required or chosen to be `null`.
 *
 * @example Add a decorator
 *
 * Any decorator `@MethodName` can be used like this:
 *
 * ```typescript
 * class HttpRequests {
 *
 *     @MethodName<BodyClass, ResultClass>(
 *         "/resource/:param/",
 *         {
 *             result: ResultClass,
 *             queryParams: {
 *                 optional: false,
 *                 required: true
 *             }
 *         }
 *     )
 *     public doSomething!: (
 *                            body: BodyClass,
 *                            pathValues: {
 *                                              param: string
 *                                        },
 *                            queryValues?: {
 *                                               required: string,
 *                                               optional?: string
 *                                          }
 *                          ) => Promise<ResultClass>;
 * }
 * ```
 *
 * Not all decorators require a `BodyClass` or `ResultClass`, depending on the underlying HTTP method, and as such are not
 * always to be defined, and `null` can used when the Class is not relevant for that portion of the HTTP request.
 * If not needed and not declared, `body`, `pathValues` and `queryValues` can be omitted.
 *
 * Therefore, a definition like this id perfectly valid:
 *
 * ```typescript
 * class HttpRequests {
 *
 *     @NoBodyMethodName<ResultClass>(
 *         "/resource/",
 *         {
 *             result: ResultClass,
 *             queryParams: {
 *                 optional: false,
 *                 required: true
 *             }
 *         }
 *     )
 *     public doSomething!: (
 *                            body: BodyClass,
 *                            queryValues?: {
 *                                               required: string,
 *                                               optional?: string
 *                                          }
 *                          ) => Promise<ResultClass>;
 * }
 * ```
 *
 * or one like this:
 *
 *
 * ```typescript
 * class HttpRequests {
 *
 *     @PlainMethodName<null, null>(
 *         "/resource/:id/",
 *         {
 *             result: null
 *         }
 *     )
 *     public doSomething!: (
 *                            pathValues: {
 *                                             id: string
 *                                        }
 *                          ) => Promise<void>;
 * }
 * ```
 *
 * For the specific elements and structure required by the specific decorators, look at the individual definitions.
 *
 * @see {@link Get|`Get`} - The `GET` method decorator.
 * @see {@link Post|`Post`} - The `POST` method decorator.
 * @see {@link Put|`Put`} - The `PUT` method decorator.
 * @see {@link Patch|`Patch`} - The `PATCH` method decorator.
 * @see {@link Delete|`Delete`} - The `DELETE` method decorator.
 *
 */
export type HttpRequestDecorator = typeof Get | typeof Put | typeof Post | typeof Patch | typeof Delete;

