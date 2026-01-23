import {HttpClient, HttpParams} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {API_ENDPOINT} from '../constants';

interface GetOptions<T> {
    result: new (...args: never[]) => T;
    resultIsArray?: boolean;
    httpParams?: HttpParams;
    queryParams?: Record<string, boolean>
}

export type Serializable<R> = Serializable<R>[] | { toJSON?: () => R } | R | null | undefined | number | string

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

const apiEndpointCorrect = API_ENDPOINT.replace(/\/+$/g, '');

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

export function Get<T>(path: string, options: GetOptions<T>) {

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
        const fn = function (this: { httpClient?: HttpClient }, ...params: Record<string, unknown>[]): Promise<T | T[]> {

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
                    throw new Error('To attach the @Get directive to a service, component or simply a class, it must contain a ');
                }
                const fromJSONFunction = options.result.fromJSON as (value: unknown) => T;
                return firstValueFrom(
                    this.httpClient.get<unknown>(
                        url,
                        {params: options.httpParams}
                    )
                )
                    .then((result) => {
                        if (options.resultIsArray == true) {
                            return (result as T[]).map(el => fromJSONFunction(el));
                        } else {
                            return fromJSONFunction(result);
                        }
                    });
            } else {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Get directive to a service, component or simply a class, it must contain a ');
                }
                return firstValueFrom(
                    this.httpClient.get<T>(
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

interface PostOptions<T> {
    result?: (new (...args: never[]) => T) | null;
    resultIsArray?: boolean;
    httpParams?: HttpParams;
    queryParams?: Record<string, boolean>
}

export function Post<B, T>(path: string, options?: PostOptions<T>) {

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
        const fn = function (this: { httpClient?: HttpClient }, body: B, ...params: Record<string, unknown>[]): Promise<T | T[]> {

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
                const fromJSONFunction = options.result.fromJSON as (value: unknown) => T;
                return firstValueFrom(
                    this.httpClient.post<unknown>(
                        url,
                        serialize(body),
                        {params: options.httpParams}
                    )
                )
                    .then((result) => {
                        if (options.resultIsArray == true) {
                            return (result as T[]).map(el => fromJSONFunction(el));
                        } else {
                            return fromJSONFunction(result);
                        }
                    });
            } else {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Put directive to a service, component or simply a class, it must contain a ');
                }
                return firstValueFrom(
                    this.httpClient.post<T>(
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


interface PutOptions<T> {
    result?: (new (...args: never[]) => T) | null;
    resultIsArray?: boolean;
    httpParams?: HttpParams;
    queryParams?: Record<string, boolean>
}

export function Put<B, T>(path: string, options?: PutOptions<T>) {

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
        const fn = function (this: { httpClient?: HttpClient }, body: B, ...params: Record<string, unknown>[]): Promise<T | T[]> {

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
                const fromJSONFunction = options.result.fromJSON as (value: unknown) => T;
                return firstValueFrom(
                    this.httpClient.put<unknown>(
                        url,
                        serialize(body),
                        {params: options.httpParams}
                    )
                )
                    .then((result) => {
                        if (options.resultIsArray == true) {
                            return (result as T[]).map(el => fromJSONFunction(el));
                        } else {
                            return fromJSONFunction(result);
                        }
                    });
            } else {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Put directive to a service, component or simply a class, it must contain a ');
                }
                return firstValueFrom(
                    this.httpClient.put<T>(
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


interface PatchOptions<T> {
    result?: (new (...args: never[]) => T) | null;
    resultIsArray?: boolean;
    httpParams?: HttpParams;
    queryParams?: Record<string, boolean>
}

export function Patch<B, T>(path: string, options?: PatchOptions<T>) {

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
        const fn = function (this: { httpClient?: HttpClient }, body: B, ...params: Record<string, unknown>[]): Promise<T | T[]> {

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
                const fromJSONFunction = options.result.fromJSON as (value: unknown) => T;
                return firstValueFrom(
                    this.httpClient.patch<unknown>(
                        url,
                        serialize(body),
                        {params: options.httpParams}
                    )
                )
                    .then((result) => {
                        if (options.resultIsArray == true) {
                            return (result as T[]).map(el => fromJSONFunction(el));
                        } else {
                            return fromJSONFunction(result);
                        }
                    });
            } else {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Patch directive to a service, component or simply a class, it must contain a ');
                }
                return firstValueFrom(
                    this.httpClient.patch<T>(
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


interface DeleteOptions<T> {
    result?: (new (...args: never[]) => T) | null;
    resultIsArray?: boolean;
    httpParams?: HttpParams;
    queryParams?: Record<string, boolean>,
    hasBody?: boolean
}

export function Delete<B, T>(path: string, options?: DeleteOptions<T>) {

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
        const fn = function (this: { httpClient?: HttpClient }, body: B | null, ...params: Record<string, unknown>[]): Promise<T | T[]> {

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
                const fromJSONFunction = options.result.fromJSON as (value: unknown) => T;
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
                            return (result as T[]).map(el => fromJSONFunction(el));
                        } else {
                            return fromJSONFunction(result);
                        }
                    });
            } else {
                if (typeof this.httpClient == 'undefined') {
                    throw new Error('To attach the @Delete directive to a service, component or simply a class, it must contain a ');
                }
                return firstValueFrom(
                    this.httpClient.delete<T>(
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
