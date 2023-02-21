import {join} from "path";
import type {PluginOption} from "vite";
import {readFile} from "fs/promises";
import {existsSync} from "fs";

const resolveWorkspaceAlias = async (root: string) => {
    const pkgJson = JSON.parse(String(await readFile(join(root, "package.json"))));

    const aliases: Record<string, string> = {}

    if (pkgJson.dependencies) {
        for (const pkg in pkgJson.dependencies) {
            if (pkgJson.dependencies[pkg].startsWith("workspace:")) {
                const aliasTo = join(root, `node_modules/${pkg}/src/index.ts`)
                if (existsSync(aliasTo)) {
                    aliases[pkg] = aliasTo;
                }
            }
        }
    }

    return aliases
};

export const app = (
    appName: string,
    {enableBaseHref}: { enableBaseHref?: boolean } = {}
): PluginOption => {
    return {
        name: "vite-presets/app",
        async config(c) {
            c.root = "./src";
            c.base = enableBaseHref ? `/${appName}/` : "/";
            c.build = c.build ?? {};
            c.build.outDir = join(process.cwd(), "./dist");
            c.build.emptyOutDir = true;

            c.resolve = c.resolve ?? {}

            c.resolve.alias = {
                ...(c.resolve.alias || {}),
                ...(await resolveWorkspaceAlias(process.cwd())),
            };
        },
    };
};
