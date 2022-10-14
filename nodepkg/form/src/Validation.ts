import { isArray, isObject } from "@innoai-tech/lodash";
import type { Schema } from "./Schema";
import { create, Expression } from "./Expression";
import { required } from "./ex";

export type Context = {
  readonly path?: string;
  readonly schema?: Schema;
  // used for `at` to get direct
  readonly root?: any;
  readonly rootSchema?: Schema;
};

export const validateForSchema = (schema: Schema) => {
  return (value: any): { [k: string]: string } => {
    const errors = {} as { [k: string]: string };

    const walkAndValidate = (ctx: Context) => (value: any) => {
      if (ctx.schema?.type === "array") {
        if (isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            walkAndValidate({
              ...ctx,
              schema: ctx.schema.items,
              path: ctx.path ? `${ctx.path}[${i}]` : `[${i}]`,
            })((value as any)[i]);
          }
        }
      }

      if (ctx.schema?.type === "object") {
        if (isObject(value)) {
          for (const [prop, subSchema] of Object.entries(
            ctx.schema.properties
          )) {
            walkAndValidate({
              ...ctx,
              schema: subSchema,
              path: ctx.path ? `${ctx.path}.${prop}` : prop,
            })((value as any)[prop]);
          }
        }
      }

      if (ctx.schema?.need) {
        const validate = create(ctx.schema?.need)(ctx);

        const needRequired = !!validate.args.find(
          (fn) => fn.type === "required"
        );

        const exists = create(required())(ctx);

        if (exists(value)) {
          if (!validate(value)) {
            errors[ctx.path || ""] = (validate as any).errMsg || "";
          }
        } else if (needRequired) {
          errors[ctx.path || ""] = (exists as any).errMsg || "";
        }
      }
    };

    walkAndValidate({
      path: "",
      root: value,
      rootSchema: schema,
      schema: schema,
    })(value);

    return errors;
  };
};

export const need = <T extends any = any>(expr: Expression<any>) => {
  const fn = create(expr);

  return (ctx = {}) => {
    const validate = fn(ctx);

    return (value: T) => {
      if (validate(value)) {
        return "";
      }
      return (validate as any).errMsg || "";
    };
  };
};
