import {isFunction, mapValues} from "@innoai-tech/lodash"

export type Schema = ObjectSchema | ArraySchema | StringSchema | NumberSchema | BooleanSchema

export interface SchemaCommon<T> {
    label?: string
    desc?: string
    default?: T
    need?: Expression<any>
}

export interface ArraySchema<T extends any[] = any[]> extends SchemaCommon<T> {
    type: "array",
    items: Schema
}

export interface ObjectSchema<T extends object = object> extends SchemaCommon<T> {
    type: "object",
    properties: { [k in keyof T]: InferSchema<T[k]> }
}

export type InferSchema<T = any> = T extends object ? ObjectSchema<T> : (
    T extends any[] ? ArraySchema<T> : (
        T extends string ? StringSchema<T> : (
            T extends number ? NumberSchema<T> : (
                T extends boolean ? BooleanSchema<T> : Schema
                )
            )
        )
    )

export interface StringSchema<T extends string = string> extends SchemaCommon<T> {
    type: "string"
    format?: string
}

export interface NumberSchema<T extends number = number> extends SchemaCommon<T> {
    type: "number"
    format?: string
}

export interface BooleanSchema<T extends boolean = boolean> extends SchemaCommon<T> {
    type: "boolean"
}

export type SchemaBuilder<T extends any> = {
    [k in keyof T]-?: (arg: T[k]) => SchemaBuilder<T>;
} & {
    (): T,
} & {
    need: (...expressions: Expression<any>[]) => SchemaBuilder<T>
}

export type Expression<TArgs extends any[]> = readonly [string, ...TArgs]

const createSchemaBuilder = <T extends Schema>(schema: Partial<T> = {}) => {
    const builder = new Proxy((): T => schema as any, {
        get(_, prop) {
            if (prop === "need") {
                return (...expressions: Expression<any>[]) => {
                    schema = {
                        ...schema,
                        [prop as any]: expressions,
                    }
                    return builder;
                }
            }

            return (v: any): any => {
                schema = {
                    ...schema,
                    [prop as any]: v,
                }
                return builder;
            };
        },
    }) as SchemaBuilder<T>

    return builder;
};

export type SchemaOrBuilder<T> = (() => T) | T

export const object = <T extends object>(properties: { [k in keyof T]: SchemaOrBuilder<InferSchema<T[k]>> }) => {
    return createSchemaBuilder<ObjectSchema<T>>({
        type: "object",
        properties: mapValues(properties, (s) => isFunction(s) ? s() : s) as any,
    });
};

export const string = <T extends string>() => createSchemaBuilder<StringSchema<T>>({type: "string"})
export const number = <T extends number>() => createSchemaBuilder<NumberSchema<T>>({type: "number"})
export const boolean = <T extends boolean>() => createSchemaBuilder<BooleanSchema<T>>({type: "boolean"})

// export const readOnly = (readOnly: boolean) => {
//     return <T extends Schema>(s: T) => {
//         return s.meta({readOnly});
//     };
// };
