import { includes, isString, keys, some } from "@innoai-tech/lodash";
import { ExpressionBuildFunc, register } from "../Expression";

export const oneOf = register(
  "oneOf",
  (...valuesOrBuildExprFns: Array<any | ExpressionBuildFunc<any, boolean>>) => {
    let asEnum = some(valuesOrBuildExprFns, (v) => isString(v));

    if (asEnum) {
      const values = valuesOrBuildExprFns;

      return () => {
        const fn = (value: any) => includes(values, value);
        fn.errMsg =
          values.length > 1
            ? `需要是 ${values.join(",")} 之一`
            : `需要是 ${values[0]}`;
        return fn;
      };
    }

    const buildExprFns = valuesOrBuildExprFns as ExpressionBuildFunc<
      any,
      boolean
    >[];

    return (ctx) => {
      const fns = buildExprFns
        .map((buildExprFn) => buildExprFn(ctx))
        .filter((fn) => !!fn);

      const fn = (v: any, c = ctx) => {
        let count = 0;

        for (const fn of fns) {
          if (fn!(v, c)) {
            count++;
          }
          if (count > 1) {
            return false;
          }
        }

        return count == 1;
      };

      fn.args = fns;
      fn.errMsg = `需满足以下任一且唯一条件：${fns
        .filter((fn: any) => fn.type !== "required" && !!fn.errMsg)
        .map((fn: any) => fn.errMsg)
        .join(";")}`;

      return fn;
    };
  }
);

export const oneOfEnum = <T extends any>(e: T) => oneOf(...keys(e));
