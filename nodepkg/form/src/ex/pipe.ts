import { type ExpressionBuildFunc, register } from "../Expression";

export const pipe = register(
  "pipe",
  <TTarget extends any>(...buildExprFns: ExpressionBuildFunc<TTarget, any>[]) =>
    (ctx) => {
      const fns: any[] = [];

      for (const fn of buildExprFns) {
        fns.push(fn(ctx));
      }

      const fn = (v: any, c = ctx) => {
        let out = v;
        for (const f of fns) {
          out = f(out, {
            ...c,
            __switch: (newCtx: any) => {
              c = newCtx;
            },
          });
        }
        return out;
      };

      fn.args = fns;
      fn.errMsg = fns
        .filter((fn: any) => fn.type !== "required" && !!fn.errMsg)
        .map((fn: any) => fn.errMsg)
        .join("");

      return fn;
    }
);
