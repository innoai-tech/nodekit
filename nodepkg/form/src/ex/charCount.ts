import {isString} from "@innoai-tech/lodash";
import {register} from "../Expression";

export const charCount = register("charCount", () =>
    () => {
        const fn = (v: any) => {
            if (isString(v)) {
                return v.match(/./gu)?.length ?? 0
            }
            return 0
        };
        fn.errMsg = `字符数`
        return fn
    });
