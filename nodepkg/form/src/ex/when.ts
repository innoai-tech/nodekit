import { get } from "@innoai-tech/lodash";
import { ExpressionBuildFunc, register } from "../Expression";

export const when = register(
  "when",
  (
    condition: ExpressionBuildFunc<any, boolean>,
    then: ExpressionBuildFunc<any, any>
  ) => {
    return (ctx) => {
      if (condition(ctx)(get(ctx, "root"))) {
        return then(ctx);
      }
      return null;
    };
  }
);
