import {get, isFunction, isNull, isString, isUndefined, keys, merge, some} from "@innoai-tech/lodash";
import {Schema, string} from "yup";

export type ValidateFn = <T extends any>(v: T, parent?: any) => boolean
export type PatchJSONSchema = (schema: any, parent: any, name?: string) => any

export type TestContext = {
    type: string,
}

export interface Validator<TValue extends any> {
    (v: TValue, parent?: any): boolean;

    displayName: string;
    formatError: (ctx: TestContext) => string;
    patchJSONSchema: PatchJSONSchema,
}

export const need = (...testings: Validator<any>[]) => {
    return <T extends Schema>(s: T) => {
        return testings.reduce((s, test) => {
            return s.test({
                name: test.displayName,
                test: (value, {parent}) => {
                    return test(value, parent);
                },
                skipAbsent: test.displayName !== "required",
                message: test.formatError({
                    type: s.type,
                }),
                params: {
                    patchJSONSchema: test.patchJSONSchema,
                }
            });
        }, s);
    };
};


const createTest = <TValue extends any = any, TArgs extends any[] = any[]>(
    name: string,
    build: (...args: TArgs) => {
        validate: ValidateFn,
        formatError: (ctx: TestContext) => string
        patchJSONSchema?: PatchJSONSchema,
    },
) => {
    return (...args: TArgs) => {
        const fn = build(...args);
        (fn.validate as any).displayName = name;
        (fn.validate as any).formatError = fn.formatError;
        (fn.validate as any).patchJSONSchema = fn.patchJSONSchema;
        return fn.validate as Validator<TValue>;
    };
};

export const required = createTest(
    "required",
    () => ({
        validate: (v) => {
            if (isUndefined(v) || isNull(v) || isNaN(v as any)) {
                return false
            }
            return !!v
        },
        formatError: () => "务必填写",
        patchJSONSchema: (schema, parent = {}, name) => {
            parent.required = [
                ...(parent.required || []),
                name,
            ]
            return schema
        }
    }),
);

export const url = createTest(
    "url",
    () => {
        const s = string().url();

        return ({
            validate: (v) => s.isValidSync(v),
            formatError: () => "请输入合法的 URL",
            patchJSONSchema: (schema = {}) => ({
                ...schema,
                format: "url"
            })
        })
    }
);

export const matches = createTest(
    "matches",
    (pattern: RegExp) => {
        const s = string().matches(pattern);

        return ({
            validate: (v) => s.isValidSync(v),
            formatError: () => `务必匹配 ${pattern}`,
            patchJSONSchema: (schema = {}) => ({
                ...schema,
                pattern: pattern.toString()
            })
        })
    }
)


export const oneOf = createTest(
    "oneOf",
    (...rules: any[]) => {
        if (some(rules, isFunction)) {
            // TODO
        }

        return ({
            validate: (value, parent) => rules.some((rule) => isFunction(rule) ? rule(value, parent) : rule === value),
            formatError: () => `务必为 ${rules.join(",")} 之一`,
            patchJSONSchema: (schema = {}) => ({
                ...schema,
                enum: [...rules],
            })
        })
    }
);

export const allOf = createTest(
    "allOf",
    (...rules: Validator<any>[]) => {
        return ({
            validate: (value, parent) => rules.every((rule) => isFunction(rule) ? rule(value, parent) : rule === value),
            formatError: () => {
                return ""
            },
            patchJSONSchema: (schema = {}, parent) => ({
                ...schema,
                allOf: rules.map((r) => r.patchJSONSchema ? r.patchJSONSchema({}, parent) : {})
            })
        })
    },
);


export const at = (key: string, test?: Validator<any>): Validator<any> => {
    const fn = (value: any, parent: any): boolean => {
        const v = key ? get(parent, key) : value
        return test ? test(v) : v
    }

    if (test) {
        fn.displayName = test.displayName;
        fn.formatError = test.formatError;
        fn.patchJSONSchema = (schema: any, parent: any = "") => {
            const s = get(parent, ["properties", key], {})
            const o = {
                required: [key],
                properties: {} as any,
            }
            o.properties[key] = test.patchJSONSchema({
                type: s.type,
            }, o, key)
            return merge(schema, o)
        }
    } else {
        fn.displayName = "exists";
        (fn as any).formatError = (_: TestContext) => `需要 ${key} 存在`;
    }


    return fn
}

export const min = createTest(
    "min",
    (min: number) => {
        return {
            validate: (v) => {
                if (isString(v)) {
                    return v.length >= min;
                }
                return v >= min
            },
            formatError: ({type}) => {
                if (type === "string") {
                    return `字符长度务必大于 ${min}`;
                }
                return `务必大于 ${min}`;
            },
            patchJSONSchema: (schema) => {
                switch (schema.type) {
                    case "string":
                        return {
                            ...schema,
                            minLength: min
                        }
                    case "number":
                        return {
                            ...schema,
                            minimum: min
                        }
                }
                return schema
            }
        }
    },
);


export const oneOfEnum = <T extends any>(e: T) => oneOf(...keys(e));
