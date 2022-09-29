import {register} from "../Expression";

export const lte = register("max", (max: number) =>
    () => {
        const fn = (v: any) => v <= max;
        fn.errMsg = `不得大于 ${max}`
        return fn
    });

