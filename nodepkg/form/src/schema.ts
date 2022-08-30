import {
    Schema,
    object as yupObject,
    string as yupString,
    boolean as yupBoolean,
    number as yupNumber,
    array as yupArray,
    InferType,
    ObjectSchema,
    ArraySchema,
} from "yup";
import type {PatchJSONSchema} from "./validation";

export type SchemaMutation = <T extends Schema>(s: T) => T;

export const object = (shape: Record<string, Schema>) => {
    return yupObject(shape);
};

export const array = (of: Schema) => {
    return yupArray(of);
};

export const string = (...mutations: SchemaMutation[]): Schema => {
    return mutations.reduce((s, m) => m(s), yupString());
};

export const boolean = (...mutations: SchemaMutation[]): Schema => {
    return mutations.reduce((s, m) => m(s), yupBoolean());
};

export const number = (...mutations: SchemaMutation[]): Schema => {
    return mutations.reduce((s, m) => m(s), yupNumber());
};

export const describe = (label: string, desc?: string) => {
    return <T extends Schema>(s: T) => {
        if (desc) {
            return s.label(label).meta({desc});
        }
        return s.label(label);
    };
};

export const readOnly = (readOnly: boolean) => {
    return <T extends Schema>(s: T) => {
        return s.meta({readOnly});
    };
};

export const def = <T extends Schema>(defaultValue: InferType<T>) => {
    return (s: T) => {
        return s.default(defaultValue);
    };
};

const patchValidation = (s: Schema, schema: any, parent = {}) => {
    const desc = s.describe()
    const name = desc.meta ? (desc.meta as any)["name"] : undefined

    for (const t of desc.tests) {
        if (t.params && t.params["patchJSONSchema"]) {
            schema = (t.params["patchJSONSchema"] as PatchJSONSchema)(schema, parent, name)
        }
    }

    return schema
}

export const dumpJSONSchema = (schema: Schema, parent?: any): any => {
    if (schema instanceof ObjectSchema) {
        const objectSchema = {
            type: "object",
            properties: {} as { [k: string]: any },
        }

        for (const n in schema.fields) {
            const s = schema.fields[n] as Schema;
            objectSchema.properties[n] = dumpJSONSchema(s.meta({name: n}), objectSchema);
        }

        for (const name in schema.fields) {
            const s = schema.fields[name] as Schema;

            if ((s as any).conditions) {

                for (const c of (s as any).conditions) {
                    if (!c.fn.condition) {
                        continue
                    }
                    const condition: any = {}

                    condition.if = c.fn.condition.test.patchJSONSchema({}, objectSchema)

                    for (const [k, v] of Object.entries({"then": "then", "otherwise": "else"})) {
                        const fn = c.fn.condition[k]
                        if (fn) {
                            condition[v] = {
                                properties: {
                                    [name]: dumpJSONSchema(fn(string())),
                                }
                            };
                        }
                    }

                    (objectSchema as any).allOf = [
                        ...((objectSchema as any).allOf || []),
                        condition,
                    ]
                }
            }
        }

        return patchValidation(schema, objectSchema, parent)
    }


    if (schema instanceof ArraySchema) {
        return patchValidation((schema as Schema), {
            type: "array",
            items: dumpJSONSchema(schema.innerType as Schema),
        }, parent)
    }

    return patchValidation(schema, {type: schema.type}, parent)
}
