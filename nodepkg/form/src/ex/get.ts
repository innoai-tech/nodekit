import {get as lodashGet} from "@innoai-tech/lodash";
import {keyPathToSchemaKeyPath, register} from "../Expression";

export const get = register("get", (ref: string) =>
    (ctx: any) => {
        return (_, c = ctx) => {
            if ((c as any).__switch) {
                (c as any).__switch({
                    ...c,
                    path: ref,
                    schema: lodashGet(ctx, keyPathToSchemaKeyPath(ref)),
                });
            }
            return lodashGet(c, `root.${ref}`);
        };
    });
