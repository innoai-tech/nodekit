import {isFunction, mapValues} from "@innoai-tech/lodash";
import {allOf} from "./ex";
import type {Expression} from "./Expression";

export type Schema =
    | ObjectSchema
    | ArraySchema
    | StringSchema
    | NumberSchema
    | BooleanSchema;

export interface SchemaCommon<T> {
    label?: string;
    desc?: string;
    readOnly?: boolean;
    default?: T;
    need?: Expression<any>;
}

export interface ArraySchema<T extends any[] = any[]> extends SchemaCommon<T> {
    type: "array";
    items: InferSchema<T[0]>;
}

export interface ObjectSchema<T extends object = object>
    extends SchemaCommon<T> {
    type: "object";
    properties: {
        [k in keyof T]: InferSchema<T[k]>;
    };
}

export type InferSchema<T = any> = T extends any[]
    ? ArraySchema<T>
    : T extends object
        ? ObjectSchema<T>
        : T extends string
            ? StringSchema<T>
            : T extends number
                ? NumberSchema<T>
                : T extends boolean
                    ? BooleanSchema<T>
                    : Schema;

export interface StringSchema<T extends string = string>
    extends SchemaCommon<T> {
    type: "string";
    format?: string;
}

export interface NumberSchema<T extends number = number>
    extends SchemaCommon<T> {
    type: "number";
    format?: string;
}

export interface BooleanSchema<T extends boolean = boolean>
    extends SchemaCommon<T> {
    type: "boolean";
}

export type SchemaBuilder<T extends any> = {
    [k in keyof T]-?: (arg: T[k]) => SchemaBuilder<T>;
} & {
    (): T;
} & {
    need: (...expressions: Expression<any>[]) => SchemaBuilder<T>;
};

const createSchemaBuilder = <T extends Schema>(schema: Partial<T> = {}) => {
    const builder = new Proxy((): T => schema as any, {
        get(_, prop) {
            if (prop === "need") {
                return (...expressions: Expression<any>[]) => {
                    schema = {
                        ...schema,
                        [prop as any]: allOf(...expressions),
                    };
                    return builder;
                };
            }

            return (v: any): any => {
                schema = {
                    ...schema,
                    [prop as any]: v,
                };
                return builder;
            };
        },
    }) as SchemaBuilder<T>;

    return builder;
};

export type SchemaOrBuilder<T> = (() => T) | T;

export const objectOf = <T extends object>(
    properties: {
        [k in keyof T]: SchemaOrBuilder<InferSchema<T[k]>>;
    },
) => {
    return createSchemaBuilder<ObjectSchema<T>>({
        type: "object",
        properties: mapValues(properties, (s) => (isFunction(s) ? s() : s)) as any,
    });
};

export const arrayOf = <T extends any[]>(
    items: SchemaOrBuilder<InferSchema<T[0]>>,
) => {
    return createSchemaBuilder<ArraySchema<T>>({
        type: "array",
        items: isFunction(items) ? items() : items,
    });
};

export const string = <T extends string>() =>
    createSchemaBuilder<StringSchema<T>>({type: "string"});
export const number = <T extends number>() =>
    createSchemaBuilder<NumberSchema<T>>({type: "number"});
export const boolean = <T extends boolean>() =>
    createSchemaBuilder<BooleanSchema<T>>({type: "boolean"});
