import { basename, extname, join, relative } from "path";
import {
  has,
  isEmpty,
  keys,
  map,
  mapKeys,
  mapValues
} from "@innoai-tech/lodash";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { readFile, unlink } from "fs/promises";
import { globby } from "globby";
import { type OutputOptions, rollup } from "rollup";
import { createAutoExternal } from "./autoExternal";
import { bootstrap } from "./bootstrap";
import { esbuild } from "./esbuild";
import { getBuildTargets } from "./getTarget";
import { createLogger } from "./log";
import { patchShebang } from "./patchShebang";
import { resolveProjectRoot } from "./pm";
import {
  type MonoBundleOptions,
  entryAlias,
  writeFormattedJsonFile
} from "./util";
import { forEach, set, startsWith } from "@innoai-tech/lodash";

const tsconfigFile = "tsconfig.monobundle.json";

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

  if (cwd === project.root) {
    // monorepo root
    if ((await project.pm.workspaces(project.root)).length) {
      return await bootstrap(project);
    }
  }

  const pkg = JSON.parse(String(await readFile(join(cwd, "package.json")))) as {
    [k: string]: any;
  };

  // skip if monobundle not defined
  if (!(has(pkg, ["monobundle"]) && pkg["monobundle"].exports)) {
    return;
  }

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

  const rollupOptions = [{
    input: inputs,
    output: {
      ...outputBase,
      dir: "./dist",
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
        return !!options.exports?.[
          `bin:${basename(chunkName, extname(chunkName))}`
          ];
      }, options.engine)
    ]
  }];

  // cleanup
  const files = await globby([
    "dist/*",
    "*.mjs",
    "*.d.ts"
  ]);
  for (const f of files) {
    await unlink(join(cwd, f));
  }

  logger.warning(`bundling (target: ${JSON.stringify(buildTargets)})`);

  const outputFiles: { [k: string]: boolean } = {};

  for (const rollupOption of rollupOptions) {

    const files = await rollup(rollupOption).then((bundle) => {
      return Promise.all(
        ([] as OutputOptions[])
          .concat(rollupOption.output ?? [])
          .map((output) => {
            if (dryRun) {
              return [];
            }
            return bundle.write(output).then((ret) => {
              if (output.dir) {
                return (ret.output || []).map((o) =>
                  join(relative(cwd, output.dir ?? ""), o.fileName)
                );
              }
              return relative(cwd, output.file ?? "");
            });
          })
      );
    });

    for (const f of files.flat()) {
      outputFiles[f] = true;
    }
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
    ...genExportsAndBin(options),
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
      "dist/*",
      "src/*",
      "!/**/__tests__"
    ],
    // FIXME remote all old entries
    types: undefined,
    main: undefined,
    module: undefined
  });

  return;
};


const genExportsAndBin = (options?: MonoBundleOptions) => {
  const pkg = {
    type: "module"
  } as { bin?: {}; exports?: {} };

  forEach(options?.exports, (entryFile, e) => {
    const distName = entryAlias(e);

    if (startsWith(e, "bin:")) {
      set(pkg, ["bin", distName], `./dist/${distName}.mjs`);
      return;
    }

    set(pkg, ["exports", e], {
      import: {
        types: `${entryFile}`,
        default: `./dist/${distName}.mjs`
      }
    });
  });

  return pkg;
};
