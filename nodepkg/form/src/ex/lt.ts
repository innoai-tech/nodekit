import {register} from "../Expression";

export const lt = register("lt", (max: number) =>
    () => {
        const fn = (v: any) => v < max;
        fn.errMsg = `需要小于 ${max}`
        return fn
    });

