export const isUndefined = (value: any): value is undefined =>
  typeof value === "undefined";
export const isFunction = (value: any): value is Function =>
  typeof value === "function";
export const isObject = (value: any): value is object =>
  !!value && value.constructor === Object;
export const isArray = Array.isArray;
