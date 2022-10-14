import { isNull, isNumber, isString, isUndefined } from "@innoai-tech/lodash";
import { register } from "../Expression";

export const required = register("required", () => () => {
  const fn = (v: any) => {
    if (isUndefined(v) || isNull(v)) {
      return false;
    }
    if (isString(v) && v === "") {
      return false;
    }
    if (isNumber(v) && isNaN(v as any)) {
      return false;
    }
    return !!v;
  };

  fn.errMsg = "务必填写";
  return fn;
});
