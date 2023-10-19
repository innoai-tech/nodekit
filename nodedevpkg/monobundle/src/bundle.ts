import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import {
  isEmpty,
  mapKeys,
  mapValues,
  keys,
  map
} from "@innoai-tech/lodash";
import { join, relative, extname, basename, dirname } from "path";
import { type OutputOptions, rollup, type RollupOptions } from "rollup";
import dts from "rollup-plugin-dts";
import { getBuildTargets } from "./getTarget";
import { createAutoExternal } from "./autoExternal";
import { createLogger } from "./log";
import { tsc } from "./tsc";
import { writeFile, readFile, unlink } from "fs/promises";
import { bootstrap } from "./bootstrap";
import { globby } from "globby";
import { esbuild } from "./esbuild";
import { patchShebang } from "./patchShebang";
import { resolveProjectRoot } from "./pm";
import { entryAlias, type MonoBundleOptions, writeFormattedJsonFile } from "./util";

const tsconfigFile = "tsconfig.monobundle.json";

type ResolveRollupOptions = () => Promise<RollupOptions>;

export const bundle = async ({
                               cwd = process.cwd(),
                               dryRun
                             }: {
  cwd?: string;
  dryRun?: boolean;
}) => {
  const project = resolveProjectRoot(cwd);

  if (!project) {
    throw new Error("must run in some monorepo");
  }

  if (project.root === cwd) {
    return await bootstrap(project);
  }

  const pkg = JSON.parse(String(await readFile(join(cwd, "package.json")))) as {
    [k: string]: any;
  };

  // skip if monobundle not defined
  if (!(pkg["monobundle"] && pkg["monobundle"].exports)) {
    return;
  }

  await writeFile(
    join(cwd, ".gitignore"),
    `
.turbo/
target/
dist/
*.mjs
*.d.ts
`
  );

  const options: MonoBundleOptions = pkg["monobundle"] || {};

  const logger = createLogger(pkg["name"]);

  const inputs = mapValues(
    mapKeys(options.exports, (_, k) => {
      return entryAlias(k);
    }),
    (entry, _) => join(cwd, entry)
  );

  const outputBase: OutputOptions = {
    dir: cwd,
    format: "es"
  };

  pkg["peerDependencies"] = {
    ...(pkg["peerDependencies"] ?? {}),
    "core-js": "*"
  };

  const autoExternal = await createAutoExternal(project, pkg as any, {
    logger,
    sideDeps: options["sideDeps"] as any
  });

  const buildTargets = getBuildTargets(
    (pkg as any).browserslist ?? ["defaults"]
  );

  const resolveRollupOptions: ResolveRollupOptions[] = [
    () => {
      return Promise.resolve({
        input: inputs,
        output: {
          ...outputBase,
          entryFileNames: "[name].mjs",
          chunkFileNames: "[name]-[hash].mjs"
        },
        plugins: [
          autoExternal(),
          nodeResolve({
            extensions: [".ts", ".tsx", ".mjs", "", ".js", ".jsx"]
          }),
          commonjs(),
          esbuild({
            tsconfig: tsconfigFile,
            target: map(buildTargets, (v, k) => `${k}${v}`)
          }),
          patchShebang((chunkName) => {
            return !!(options.exports ?? {})[
              `bin:${basename(chunkName, extname(chunkName))}`
              ];
          }, options.engine)
        ]
      });
    },

    async () => {
      const files = await globby(["*.mjs", "*.d.ts"]);

      for (const f of files) {
        if (outputFiles[f]) {
          continue;
        }
        await unlink(join(cwd, f));
      }

      await tsc(cwd, ".turbo/types", tsconfigFile);

      const indexForDts = mapValues(inputs, (input) => {
        const f = join(cwd, ".turbo/types", relative(join(cwd, "src"), input));
        return `${join(dirname(f), basename(f, extname(f)))}.d.ts`;
      });

      return {
        input: indexForDts,
        output: {
          ...outputBase,
          entryFileNames: "[name].d.ts",
          chunkFileNames: "[name]-[hash].d.ts"
        },
        plugins: [
          autoExternal(),
          dts({
            tsconfig: tsconfigFile,
            respectExternal: true
          }) as any
        ]
      };
    }
  ];

  logger.warning(`bundling (target: ${JSON.stringify(buildTargets)})`);

  let outputFiles: { [k: string]: boolean } = {};

  for (const resolveRollupOption of resolveRollupOptions) {
    const rollupOption = await resolveRollupOption();

    const files = await rollup(rollupOption).then((bundle) => {
      return Promise.all(
        ([] as OutputOptions[]).concat(rollupOption.output!).map((output) => {
          if (dryRun) {
            return [];
          }
          return bundle.write(output).then((ret) => {
            if (output.dir) {
              return (ret.output || []).map((o) =>
                join(relative(cwd, output.dir!), o.fileName)
              );
            }
            return relative(cwd, output.file!);
          });
        })
      );
    });

    files.flat().forEach((f) => {
      outputFiles[f] = true;
    });
  }

  logger.success("bundled", ...keys(outputFiles));

  const unused = autoExternal.warningAndGetUnused();

  for (const dep in unused.peerDeps) {
    pkg["peerDependencies"][dep] = undefined;
  }

  for (const dep in unused.deps) {
    pkg["dependencies"][dep] = undefined;
  }

  await writeFormattedJsonFile(join(cwd, "package.json"), {
    ...pkg,
    dependencies: isEmpty(pkg["dependencies"])
      ? undefined
      : (pkg["dependencies"] as { [k: string]: string }),
    peerDependencies: isEmpty(pkg["peerDependencies"])
      ? undefined
      : (pkg["peerDependencies"] as { [k: string]: string }),
    devDependencies: isEmpty(pkg["devDependencies"])
      ? undefined
      : (pkg["devDependencies"] as { [k: string]: string }),
    files: [
      "*.mjs",
      "*.d.ts",
      "src/*",
      "!/**/__tests__"
    ],
    type: "module",
    // FIXME remote all old entries
    types: undefined,
    main: undefined,
    module: undefined
  });

  return;
};
