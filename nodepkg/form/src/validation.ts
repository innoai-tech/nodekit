import {
    every,
    isArray,
    isNull,
    isObject,
    isString,
    isUndefined,
    keys,
    some,
    partition,
    isNumber
} from "@innoai-tech/lodash";
import type {Expression, Schema} from "./Schema";

export type Context = {
    schema?: Schema,
    parent?: any,
    root?: any
    path?: string
}


export type ValidateFn<T extends any> = (v: T, ctx?: Context) => string

export interface Validator<TTarget extends any> {
    (v: TTarget, ctx?: Context): boolean

    errMsg?: string;
}

const validatorCreators: { [k: string]: (schema: Schema, ...args: any[]) => Validator<any> } = {}

export const validateFor = (expr: Expression<any>, schema: Schema) => {
    const [name, ...args] = expr;
    if (!isString(name)) {
        throw new Error(`invalid '${expr}'`)
    }
    const createValidate = validatorCreators[name]
    if (!createValidate) {
        throw new Error(`unknown '${name}'`)
    }
    return createValidate(schema, ...args)
}


export const validateForSchema = (schema: Schema) => {
    const walkAndValidate = (errors: any, value: any, ctx: Required<Context>) => {
        if (ctx.schema.type == "object") {
            if (!isObject(value)) {
                errors[ctx.path] = "需要 object"
                return
            }

            for (const [prop, subSchema] of Object.entries(ctx.schema.properties)) {
                walkAndValidate(errors, (value as any)[prop], {
                    ...ctx,
                    schema: subSchema,
                    path: ctx.path ? `${ctx.path}.${prop}` : prop,
                    parent: value,
                })
            }
        }

        if (ctx.schema.need) {
            const [rulesForRequired, others] = partition(ctx.schema.need, (expr) => expr[0] == "required")
            const isRequired = rulesForRequired.length > 0

            const checkExists = validateFor(required(), ctx.schema)

            if (checkExists(value, ctx)) {
                if (others.length > 0) {
                    const validate = validateFor(allOf(...(others as any)), ctx.schema)
                    if (!validate(value, ctx)) {
                        errors[ctx.path] = validate.errMsg
                    }
                }
            } else if (isRequired) {
                errors[ctx.path] = checkExists.errMsg
            }
        }
    }

    return (value: any, _?: Context) => {
        const errors = {}

        walkAndValidate(errors, value, {
            schema: schema!,
            path: "",
            root: value,
            parent: undefined,
        })

        return errors
    }

}

export const need = <T extends any = any>(expr: Expression<any>, schema: Schema): ValidateFn<T> => {
    const fn = validateFor(expr, schema);

    return (value, ctx = {}) => {
        if (fn(value, ctx)) {
            return ""
        }
        return fn.errMsg || `${name} is not valid`
    }
}

export const withErrMsg = <T extends Function>(fn: T, errMsg: string) => {
    (fn as any).errMsg = errMsg
    return fn as T & { errMsg: string }
}

export const register = <TName extends string, TArgs extends any[], TTarget extends any>(
    name: TName,
    createValidator: (schema: Schema, ...args: TArgs) => Validator<TTarget>,
) => {
    validatorCreators[name] = createValidator as any
    return (...args: TArgs) => [name, ...args] as const
};

export const required = register("required", () => {
    return withErrMsg((v: any) => {
        if (isUndefined(v) || isNull(v)) {
            return false
        }

        if (isString(v) && (v === "")) {
            return false
        }

        if (isNumber(v) && isNaN(v as any)) {
            return false
        }

        return !!v
    }, "务必填写");
})


export const oneOf = register("oneOf", (schema: Schema, ...rules: Expression<any>[] | any[]) => {
    let isEnum = true

    const validates = rules.map((ruleOrValue) => {
        if (isArray(ruleOrValue) && isString(ruleOrValue[0])) {
            isEnum = false
            return validateFor(ruleOrValue as any, schema)
        }
        return (value: any) => ruleOrValue === value
    })


    if (isEnum) {
        return withErrMsg(
            (value: any) => some(validates, (validate) => validate(value, parent)),
            `需要是 ${rules.join(",")} 之一`
        )
    }

    return withErrMsg(
        (value: any) => some(validates, (validate) => validate(value, parent)),
        validates.map((fn: any) => fn.errMsg).join(", 或"),
    )
})

export const allOf = register("allOf", (schema, ...rules: Expression<any>[]) => {
    const validates = rules
        .filter((expr) => isArray(expr))
        .map((expr) => validateFor(expr as any, schema))

    return withErrMsg(
        (value: any, parent: any) => every(validates, (validate) => validate(value, parent)),
        validates.map((fn: any) => fn.errMsg).join(", 且"),
    )
})

export const matches = register("matches", (_, pattern: RegExp) => {
    return withErrMsg((v: string) => pattern.test(v), `务必匹配 ${pattern}`)
})

export const min = register("min", (schema, min: number) => {
    if (schema.type === "string") {
        // TODO to use char count
        return withErrMsg((v: any = "") => v.length >= min, `至少需要 ${min} 个字符`);
    }
    return withErrMsg((v: any) => v >= min, `不得小于 ${min}`)
})


export const max = register("max", (schema, min: number) => {
    if (schema.type === "string") {
        return withErrMsg((v: any = "") => v.length <= min, `字符长度不得超过 ${min}`);
    }
    return withErrMsg((v: any) => v <= min, `不得大于 ${min}`)
})

export const oneOfEnum = <T extends any>(e: T) => oneOf(...keys(e));
