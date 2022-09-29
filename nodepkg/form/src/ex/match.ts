import {register} from "../Expression";

export const match = register("match", (pattern: RegExp) =>
    () => {
        const fn = (v: string) => pattern.test(v);
        fn.errMsg = `务必匹配 ${pattern}`;
        return fn;
    });
