import {get, isString, map} from "@innoai-tech/lodash";

export type Expression<TArgs extends any[]> = readonly [string, ...TArgs];

export interface ExpressionFunc<TInput extends any,
    TOutput extends any,
    TContext extends any,
    > {
    (v: TInput, ctx: TContext): TOutput;

    displayName?: string;
}

const exprCreators: {
    [k: string]: (...args: any[]) => ExpressionFunc<any, any, any>;
} = {};

export const create = <TFunc extends ExpressionFunc<any, any, any>>(
    expr: Expression<any>,
): TFunc => {
    const [name, ...args] = expr;
    if (!isString(name)) {
        throw new Error(`invalid '${expr}'`);
    }
    const fn = exprCreators[name];
    if (!fn) {
        throw new Error(`unknown expression '${name}'`);
    }
    const v = fn(...args);
    v.displayName = name;
    return v as TFunc;
};

export const register = <TFunc extends ExpressionFunc<any, any, any>,
    TArgs extends any[] = any,
    >(name: string, exprCreator: (...args: TArgs) => TFunc) => {
    exprCreators[name] = exprCreator as any;
    return (...args: TArgs) => [name, ...args] as const;
};

export const when = register("when", (
    ...condThensAndMayDefault: Expression<any>[]
) => {
    const rules = map(condThensAndMayDefault, (e) => create(e));

    return (v, ctx) => {
        for (let i = 0; i < ((rules.length - (rules.length % 2)) / 2); i++) {
            // as condition, should disable error collection
            if (rules[2 * i]!(v, {...ctx, errors: null})) {
                return rules[2 * i + 1]!(v, ctx);
            }
        }

        if (rules.length % 2 === 0) {
            return undefined;
        }

        return rules[rules.length - 1]!(v, ctx);
    };
});

export const at = register("at", (ref: string, expr: Expression<any>) => {
    const next = create(expr);

    return (_, ctx) => {
        return next(get(ctx.root || {}, ref), {
            ...ctx,
            path: ref,
            schema: get(ctx.rootSchema || {}, keyPathToSchemaKeyPath(ref))
        });
    };
});

export const keyPathToSchemaKeyPath = (ref: string) => {
    return `${ref[0] === '[' ? ref : `.${ref}`}`
        .replace(/[.]/g, ".properties")
        .replace(/\[[0-9]+]/g, ".items")
        .slice(1)
}
