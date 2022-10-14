import { register } from "../Expression";

export const eq = register("eq", (expect: any) => () => {
  const fn = (v: any) => v == expect;
  fn.errMsg = `需要是 ${expect}`;
  return fn;
});
