import {get, isString, isArray, isUndefined} from "@innoai-tech/lodash";

export const isExpression = (args: any[]): boolean => {
    if (isArray(args) && args.length > 0) {
        return isString(args[0]);
    }
    return false;
};

export type Expression<TArgs extends any[] = any[]> = readonly [
    string,
    ...TArgs,
];

export interface ExpressionFunc<TInput, TOutput> {
    (v: TInput): TOutput;

    type: string;
    args: any[];
}

export interface ExpressionBuildFunc<TInput,
    TOutput,
    TContext extends object = {},
    > {
    (ctx: TContext): ExpressionFunc<TInput, TOutput>;
}

export const isValidBuildExprFn = (fn: any) =>
    !!fn && fn.type && fn.type !== "noop";

export const walkExpression = (
    expr: any,
    cb: (name: string, args: any[]) => void,
) => {
    if (isExpression(expr as any)) {
        const [name, ...args] = expr;
        cb(name, args);

        for (const arg of args) {
            walkExpression(arg, cb);
        }
    }
};

export const factory = (builders: {
    [k: string]: (...args: any[]) => ExpressionBuildFunc<any, any>;
}) => {
    const noop = (_: void) => null;
    noop.type = "noop";

    return {
        register<TInput,
            TOutput,
            TContext extends object = {},
            TArgs extends any[] = any,
            >(
            name: string,
            buildExprFn: (
                ...args: TArgs
            ) => (ctx: TContext) => null | ((v: TInput) => TOutput),
        ) {
            builders[name] = buildExprFn as any;
            return (...args: InferArgs<TArgs>) => [name, ...args] as const;
        },
        create: <TInput, TOutput, TContext extends object = {}>(
            expr: Expression,
        ): ExpressionBuildFunc<TInput, TOutput, TContext> => {
            const [name, ...args] = expr;
            if (!isString(name)) {
                throw new Error(`invalid '${expr}'`);
            }

            const b = builders[name];
            if (!b) {
                throw new Error(`unknown expression ${name}(${args})`);
            }

            // convert expr to expr build fns
            const argsOrBuildExprFns = args.map((e) => {
                if (isExpression(e)) {
                    return create(e);
                }
                return e;
            });

            return (ctx: TContext): ExpressionFunc<TInput, TOutput> => {
                const exprFn = b(...argsOrBuildExprFns);

                let fn = exprFn(ctx);

                if (fn) {
                    return new Proxy(fn, {
                        get(target, prop: string | symbol): any {
                            const type = target.type || name;
                            const args = target.args || argsOrBuildExprFns;

                            if (prop === "toString") {
                                return () =>
                                    `${type}(${args.map(
                                        (arg) => (isString(arg) ? `"${arg}"` : arg),
                                    )})`;
                            }

                            if (prop === "type") {
                                return type;
                            }

                            if (prop === "args") {
                                return args;
                            }

                            return (target as any)[prop];
                        },
                    });
                }

                return noop as any;
            };
        },
    };
};

export type InferArgs<TArgs extends [...any[]]> = {
    [I in keyof TArgs]: TArgs[I] extends ExpressionBuildFunc<any, any>
        ? Expression<any>
        : TArgs[I];
};

const f = factory({});

export const register = f.register;
export const create = f.create;

export const keyPathToSchemaKeyPath = (ref: string) => {
    return `rootSchema${ref[0] === "[" ? ref : `.${ref}`}`.replace(
        /[.]/g,
        ".properties.",
    ).replace(/\[[0-9]+]/g, ".items");
};

export const at = register("at", (
    ref: string,
    next: ExpressionBuildFunc<any, any>,
) => {
    return (ctx) => {
        const fn = next({
            ...ctx,
            path: ref,
            schema: get(ctx, keyPathToSchemaKeyPath(ref)),
        });

        if (fn) {
            return (_) => fn(get(ctx, `root.${ref}`));
        }

        return null;
    };
});

export const select = register("select", <TTarget extends any>(
    ...buildExprFns: ExpressionBuildFunc<TTarget, boolean>[]
) => {
    return (ctx) => {
        for (const buildExprFn of buildExprFns) {
            const fn = buildExprFn(ctx);

            if (!isValidBuildExprFn(fn)) {
                continue;
            }

            if (fn) {
                return fn;
            }
        }

        return null;
    };
});

export const allOf = register("allOf", <TTarget extends any>(
    ...buildExprFns: ExpressionBuildFunc<TTarget, boolean>[]
) => {
    return (ctx) => {
        const fns = buildExprFns.map((buildExprFn) => buildExprFn(ctx)).filter(
            isValidBuildExprFn,
        );

        const fn = (value: TTarget) => {
            const isUndefinedValue = isUndefined(value);

            for (const f of fns) {
                // skip undefined value
                if (isUndefinedValue && f.type !== "required") {
                    continue;
                }
                if (!f(value)) {
                    return false;
                }
            }
            return true;
        };

        fn.args = fns;
        fn.errMsg = fns
            .filter((fn: any) => fn.type !== "required" && !!fn.errMsg)
            .map((fn: any) => fn.errMsg)
            .join(", 且");

        return fn;
    };
});

export const when = register("when", (
    condition: ExpressionBuildFunc<any, boolean>,
    then: ExpressionBuildFunc<any, any>,
) => {
    return (ctx) => {
        if (condition(ctx)(get(ctx, "root"))) {
            return then(ctx);
        }
        return null;
    };
});
