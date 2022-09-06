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
    isNumber,
} from "@innoai-tech/lodash";
import type {Schema} from "./Schema";
import type {Expression, ExpressionFunc} from "./Expression";
import {create, register} from "./Expression";

export type Context = {
    readonly schema?: Schema;
    readonly root?: any;
    readonly rootSchema?: Schema;

    readonly path?: string;
    readonly errors?: null | ({ [keyPath: string]: string });
};

export type ValidateFn<T extends any> = (v: T, ctx?: Context) => string;

export interface Validator<TTarget extends any>
    extends ExpressionFunc<TTarget, boolean, Context> {
    errMsg?: (ctx: Context) => string;
}

export const validateFor = (expr: Expression<any>) => {
    return create<Validator<any>>(expr);
};

export const createValidator = <TArgs extends any[], TTarget extends any>(
    name: string,
    validatorCreator: (...args: TArgs) => Validator<TTarget>,
) => register<Validator<any>, TArgs>(name, validatorCreator);

export const validateForSchema = (schema: Schema) => {
    const walkAndValidate = (value: any, ctx: Required<Context>) => {
        const [rulesForRequired, others] = partition(
            ctx.schema.need || [],
            (expr) => expr[0] === "required",
        );
        const needRequired = rulesForRequired.length > 0;

        const exists = validateFor(required());

        if (exists(value, {...ctx, errors: null})) {
            if (ctx.schema.type === "array") {
                if (!isArray(value)) {
                    if (ctx.errors) {
                        ctx.errors[ctx.path] = "需要 array";
                    }
                    return;
                }

                for (let i = 0; i < value.length; i++) {
                    walkAndValidate((value as any)[i], {
                        ...ctx,
                        schema: ctx.schema.items,
                        path: ctx.path ? `${ctx.path}[${i}]` : `[${i}]`,
                    });
                }
            }

            if (ctx.schema.type === "object") {
                if (!isObject(value)) {
                    if (ctx.errors) {
                        ctx.errors[ctx.path] = "需要 object";
                    }
                    return;
                }

                for (const [prop, subSchema] of Object.entries(ctx.schema.properties)) {
                    walkAndValidate((value as any)[prop], {
                        ...ctx,
                        schema: subSchema,
                        path: ctx.path ? `${ctx.path}.${prop}` : prop,
                    });
                }
            }

            if (others.length > 0) {
                validateFor(allOf(...(others as any)))(value, ctx);
            }
        } else if (needRequired) {
            if (ctx.errors) {
                ctx.errors[ctx.path] = exists.errMsg!(ctx);
            }
        }
    };

    return (value: any, _: Context = {}): { [k: string]: string } => {
        const errors = {};

        walkAndValidate(value, {
            path: "",
            root: value,
            rootSchema: schema,
            schema: schema,
            errors,
        });

        return errors;
    };
};

export const need = <T extends any = any>(
    expr: Expression<any>,
): ValidateFn<T> => {
    const fn = validateFor(expr);
    return (value, ctx = {}) => {
        const errors: any = {};
        if (fn(value, {...ctx, errors, path: ""})) {
            return "";
        }
        return errors[""] || "";
    };
};

export const withErrMsg = <T extends Validator<any>>(
    fn: T,
    errMsg: (ctx: Context) => string,
) => {
    const validate = (value: any, ctx: Context) => {
        if (fn(value, ctx)) {
            return true;
        }
        if (ctx.errors) {
            ctx.errors[ctx.path || ""] = errMsg(ctx);
        }
        return false;
    };

    (validate as any).errMsg = errMsg;

    return validate as T & { errMsg: (ctx: Context) => string };
};

export const required = createValidator("required", () => {
    return withErrMsg(
        (v: any) => {
            if (isUndefined(v) || isNull(v)) {
                return false;
            }
            if (isString(v) && (v === "")) {
                return false;
            }
            if (isNumber(v) && isNaN(v as any)) {
                return false;
            }
            return !!v;
        },
        () => "务必填写",
    );
});

export const oneOf = createValidator("oneOf", (
    ...rules: Expression<any>[] | any[]
) => {
    let isEnum = true;

    const validates = rules.map((ruleOrValue) => {
        if (isArray(ruleOrValue) && isString(ruleOrValue[0])) {
            isEnum = false;
            return validateFor(ruleOrValue as any);
        }
        return (value: any) => ruleOrValue === value;
    });

    if (isEnum) {
        return withErrMsg(
            (value: any, ctx) => some(validates, (validate) => validate(value, ctx)),
            () => `需要是 ${rules.join(",")} 之一`,
        );
    }

    if (validates.length === 1) {
        return validates[0]!;
    }

    return withErrMsg(
        (value: any, ctx) => some(validates, (validate) => validate(value, ctx)),
        (ctx) =>
            validates
                .filter((fn: any) => !!fn.errMsg)
                .map((fn: any) => fn.errMsg(ctx))
                .join(", 或"),
    );
});

export const allOf = createValidator("allOf", (...rules: Expression<any>[]) => {
    const validates = rules.filter((expr) => isArray(expr)).map(
        (expr) => validateFor(expr as any),
    );

    if (validates.length === 1) {
        return validates[0]!;
    }

    return withErrMsg(
        (value: any, ctx: any) =>
            every(validates, (validate) => validate(value, ctx)),
        (ctx) =>
            validates
                .filter((fn: any) => !!fn.errMsg)
                .map((fn: any) => fn.errMsg(ctx))
                .join(", 且"),
    );
});

export const matches = createValidator("matches", (pattern: RegExp) => {
    return withErrMsg((v: string) => pattern.test(v), () => `务必匹配 ${pattern}`);
});

export const min = createValidator(
    "min",
    (min: number) =>
        withErrMsg(
            (v: any, ctx) => {
                if (ctx.schema?.type === "string") {
                    return v.length >= min;
                }
                return v >= min;
            },
            (ctx) => {
                if (ctx.schema?.type === "string") {
                    return `至少需要 ${min} 个字符`;
                }
                return `不得小于 ${min}`;
            },
        ),
);

export const max = createValidator(
    "max",
    (max: number) =>
        withErrMsg(
            (v: any, ctx) => {
                if (ctx.schema?.type === "string") {
                    return v.length <= max;
                }
                return v <= max;
            },
            (ctx) => {
                if (ctx.schema?.type === "string") {
                    return `不得超过 ${max} 个字符`;
                }
                return `不得大于 ${max}`;
            },
        ),
);

export const oneOfEnum = <T extends any>(e: T) => oneOf(...keys(e));
