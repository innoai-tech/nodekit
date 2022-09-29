import {isUndefined} from "@innoai-tech/lodash";
import {ExpressionBuildFunc, isValidBuildExprFn, register} from "../Expression";

export const allOf = register("allOf", <TTarget extends any>(
    ...buildExprFns: ExpressionBuildFunc<TTarget, boolean>[]
) =>
    (ctx) => {
        const fns = buildExprFns.map((buildExprFn) => buildExprFn(ctx)).filter(
            isValidBuildExprFn,
        );

        const fn = (v: TTarget, c = ctx) => {
            const isUndefinedValue = isUndefined(v);

            for (const f of fns) {
                // skip undefined value
                if (isUndefinedValue && f.type !== "required") {
                    continue;
                }

                if (!f(v, c)) {
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
    });