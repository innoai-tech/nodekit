import { existsSync } from "fs";
import { last } from "@innoai-tech/lodash";
import { minimatch } from "minimatch";
import { dirname, join, resolve } from "path";
import type { InputOptions } from "rollup";
// @ts-ignore
const builtIns = process.binding("natives");

const isPkgUsed = (pkg: string, id: string) => {
  return id === pkg || `@types/${id}` === pkg || id.startsWith(`${pkg}/`);
};

export const createAutoExternal = (
  monoRoot: string,
  pkg: any,
  opts: {
    logger?: ReturnType<typeof import("./log").createLogger>;
    sideDeps?: string[];
  }
) => {
  const logger = opts.logger;
  const sideDeps = opts.sideDeps || [];

  const isSideDep = (pkgName: string) => {
    if (sideDeps.length === 0) {
      return false;
    }
    return sideDeps.some(
      (glob) => pkgName === glob || minimatch(pkgName, glob)
    );
  };

  let deps: string[] = [];

  const usedPkgs: any = {};

  if (pkg.dependencies) {
    deps = [...deps, ...Object.keys(pkg.dependencies)];
  }

  if (pkg.peerDependencies) {
    deps = [...deps, ...Object.keys(pkg.peerDependencies)];
  }

  const builtins = Object.keys(builtIns);

  const warningAndGetUnused = () => {
    const used = Object.keys(usedPkgs);

    const unused = {
      deps: {} as { [k: string]: boolean },
      peerDeps: {} as { [k: string]: boolean },
    };

    if (pkg.dependencies) {
      Object.keys(pkg.dependencies).forEach((dep) => {
        if (isSideDep(dep)) {
          return;
        }

        if (!used.some((id) => isPkgUsed(dep, id))) {
          unused.deps[dep] = true;
        }
      });
    }

    if (pkg.peerDependencies) {
      Object.keys(pkg.peerDependencies).forEach((dep) => {
        if (isSideDep(dep)) {
          return;
        }

        if (!used.some((id) => isPkgUsed(dep, id))) {
          unused.peerDeps[dep] = true;
        }
      });
    }

    return unused;
  };

  const autoExternal = (validate = true) => {
    const collector = new Set<string>();

    return {
      name: "auto-external",

      options(opts: InputOptions) {
        const external = (
          id: string,
          importer: string | undefined,
          isResolved: boolean
        ) => {
          if (
            typeof opts.external === "function" &&
            opts.external(id, importer, isResolved)
          ) {
            return true;
          }

          if (Array.isArray(opts.external) && opts.external.includes(id)) {
            return true;
          }

          if (!(id.startsWith(".") || id.startsWith("/"))) {
            const parts = id.split("/");

            if (parts.length > 2 && last(parts) === "macro") {
              // import types of /macro
              return false;
            }

            if (
              parts.length > 2 &&
              existsSync(join(monoRoot, parts[0]!, parts[1]!))
            ) {
              if (parts[2] !== "jsx-runtime") {
                throw new Error(
                  `import error at ${importer}, don't import sub file ${id}.`
                );
              }
            }

            const isDep = deps.some((idx) => id.startsWith(idx));
            const isBuiltIn = builtins.some((idx) => id.startsWith(idx));

            if (isDep) {
              usedPkgs[id] = true;
            }

            if (isBuiltIn || isDep) {
              return true;
            }

            if (validate) {
              if (!collector.has(id)) {
                collector.add(id);

                logger?.danger(
                  `"${id}" is not in dependencies or peerDependencies, and will be bundled.`
                );
              }
            }

            return false;
          }

          return false;
        };

        return Object.assign({}, opts, { external });
      },

      resolveId(id: string, importer: any) {
        if (!importer) {
          return;
        }

        const parts = resolve(dirname(importer), id).split("/build/");

        if (parts.length !== 2) {
          return;
        }

        if (existsSync(join(monoRoot, parts[1]!, "package.json"))) {
          return {
            id: parts[1],
            external: true,
          };
        }

        return;
      },
    };
  };

  autoExternal.warningAndGetUnused = warningAndGetUnused;

  return autoExternal;
};
