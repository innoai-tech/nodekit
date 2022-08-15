import yargs from "yargs";
import {bundle} from "../bundle";

(async () => {
    const opt = await yargs(process.argv.slice(2)).option("dryRun", {
        alias: "dry-run",
        type: "boolean",
    }).argv;

    await bundle({
        ...opt,
        ...(opt._.length > 0 ? {cwd: opt._[0]} : {}),
    } as any);
})().catch(console.error)