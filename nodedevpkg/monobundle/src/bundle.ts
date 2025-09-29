import { basename, extname, join, relative } from "path";
import { forEach, has, isEmpty, keys, mapKeys, mapValues, set, startsWith } from "@innoai-tech/lodash";
import { readFile, unlink } from "fs/promises";
import { globby } from "globby";
import { type OutputOptions, rolldown } from "rolldown";
import { createAutoExternal } from "./autoExternal";
import { bootstrap } from "./bootstrap";
import { createLogger } from "./log";
import { patchShebang } from "./patchShebang";
import { resolveProjectRoot } from "./pm";
import { entryAlias, type MonoBundleOptions, writeFormattedJsonFile } from "./util";
import { chunkCleanup } from "./chunkCleanup.ts";
import { vueComponentComplete } from "./vueComponentComplete.ts";

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

  const rolldownOptions = [
    {
      input: inputs,
      output: {
        ...outputBase,
        dir: "./dist",
        entryFileNames: "[name].mjs",
        chunkFileNames: "[name]-[hash].mjs"
      },
      resolve: {
        extensions: [".ts", ".tsx", ".mjs", "", ".js", ".jsx"]
      },
      tsconfig: tsconfigFile,
      plugins: [
        autoExternal(),
        vueComponentComplete({}),
        patchShebang((chunkName) => {
          return !!options.exports?.[
            `bin:${basename(chunkName, extname(chunkName))}`
            ];
        }, options.engine),
        chunkCleanup()
      ]
    }
  ];

  // cleanup
  const files = await globby(["dist/*", "*.mjs", "*.d.ts"]);
  for (const f of files) {
    await unlink(join(cwd, f));
  }

  logger.warning(`bundling`);

  const outputFiles: { [k: string]: boolean } = {};

  for (const rolldownOption of rolldownOptions) {
    const files = await rolldown(rolldownOption).then((bundle) => {
      return Promise.all(
        ([] as OutputOptions[])
          .concat(rolldownOption.output ?? [])
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
    files: ["dist/*", "src/*", "!/**/__tests__"],
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
      bun: `${entryFile}`,
      import: {
        types: `${entryFile}`,
        default: `./dist/${distName}.mjs`
      }
    });
  });

  return pkg;
};
