import type {Schema, InferType} from "yup";

export const when = <T extends Schema<any>,
    UThen extends Schema<any> = T,
    UOtherwise extends Schema<any> = T,
    >(
    test: (value: InferType<T>, parent: any) => boolean,
    options: {
        then?: (schema: T) => UThen,
        otherwise?: (schema: T) => UOtherwise,
    }
) => {
    return (s: T) => {
        const when = (_: any[], schema: T, ctx: any) => {
            if (test(ctx.value, ctx.parent)) {
                return options.then ? options.then(schema) : schema
            }
            return options.otherwise ? options.otherwise(schema) : schema
        }
        when.condition = {
            test,
            then: options.then,
            otherwise: options.otherwise,
        };
        return s.when(when);
    };
};


