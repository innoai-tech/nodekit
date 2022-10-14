import { register } from "../Expression";

export const gte = register("gte", (min: number) => () => {
  const fn = (v: any) => v >= min;
  fn.errMsg = `不得小于 ${min}`;
  return fn;
});
