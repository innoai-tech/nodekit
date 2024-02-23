import { join } from "path";
import { readFile } from "fs/promises";
import { globby } from "globby";
import { minimatch } from "minimatch";
import { type InputOptions } from "rollup";
import type { Project } from "./pm";
// @ts-ignore
const builtIns = process.binding("natives");

const isPkgUsed = (pkg: string, id: string) => {
  return id === pkg || `@types/${id}` === pkg || id.startsWith(`${pkg}/`);
};

export type Package = {
  name: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export const loadWorkspace = async (project: Project, localPkg: Package) => {
  const workspaces = await project.pm.workspaces(project.root);

  const m = new Map<string, Set<string>>();

  if (workspaces) {
    const packageJSONs = await globby(
      workspaces.map((b) => `${b}/package.json`),
      {
        cwd: project.root,
      },
    );

    for (const f of packageJSONs) {
      let pkg = JSON.parse(
        String(await readFile(join(`${project.root}`, f))),
      ) as Package;

      // localPkg may be changed
      if (localPkg.name === pkg.name) {
        pkg = localPkg;
      }

      const dep = new Set<string>();

      if (pkg.name) {
        dep.add(pkg.name);
      }

      if (pkg.dependencies) {
        for (const d in pkg.dependencies) {
          dep.add(d);
        }
      }

      if (pkg.peerDependencies) {
        for (const d in pkg.peerDependencies) {
          dep.add(d);
        }
      }

      m.set(pkg.name, dep);
    }
  }

  return m;
};

export const createAutoExternal = async (
  project: Project,
  pkg: Package,
  opts: {
    logger?: ReturnType<typeof import("./log").createLogger>;
    sideDeps?: string[];
  },
) => {
  const logger = opts.logger;
  const sideDeps = opts.sideDeps || [];

  const isSideDep = (pkgName: string) => {
    if (sideDeps.length === 0) {
      return false;
    }
    return sideDeps.some(
      (glob) => pkgName === glob || minimatch(pkgName, glob),
    );
  };

  const usedPkgs = new Set<string>();

  const w = await loadWorkspace(project, pkg);

  const dep = new Set<string>();

  const collect = (pkgName: string) => {
    const pkgDep = w.get(pkgName);

    if (pkgDep) {
      for (const d of pkgDep) {
        dep.add(d);

        if (d !== pkgName) {
          collect(d);
        }
      }
    }
  };

  collect(pkg.name);

  const builtins = Object.keys(builtIns);

  const warningAndGetUnused = () => {
    const used = [...usedPkgs.keys()];

    const unused = {
      deps: {} as { [k: string]: boolean },
      peerDeps: {} as { [k: string]: boolean },
    };

    for (const d of dep) {
      if (isSideDep(d)) {
        continue;
      }

      if (!used.some((id) => isPkgUsed(d, id))) {
        unused.deps[d] = true;
        unused.peerDeps[d] = true;
      }
    }

    return unused;
  };

  const collector = new Set<string>();

  const autoExternal = (validate = true) => {
    return {
      name: "auto-external",

      options(opts: InputOptions) {
        return {
          ...opts,
          external(
            id: string,
            importer: string | undefined,
            isResolved: boolean,
          ) {
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
              const isDep = [...dep.keys()].some((d) => id.startsWith(d));
              const isBuiltIn = builtins.some((b) => id.startsWith(b));

              if (isDep) {
                usedPkgs.add(id);
              }

              if (isBuiltIn || isDep) {
                return true;
              }

              if (validate) {
                if (!collector.has(id)) {
                  collector.add(id);

                  logger?.danger(
                    `"${id}" is not in dependencies or peerDependencies, and will be bundled.`,
                  );
                }
              }

              return false;
            }

            return false;
          },
        };
      },
    };
  };

  autoExternal.warningAndGetUnused = warningAndGetUnused;

  return autoExternal;
};
