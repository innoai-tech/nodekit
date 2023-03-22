import { get } from "@innoai-tech/lodash";
import { readFileSync } from "fs";
import { dirname, isAbsolute, join, resolve } from "path";
import type { ManualChunkMeta, PreRenderedChunk, OutputOptions } from "rollup";
import { type PluginOption, searchForWorkspaceRoot } from "vite";

export interface ChunkSplitOptions {
  libRoot?: string[];
  handleModuleFederations?: (pkgRelations: Record<string, ModuleFederation>) => void;
}

export const viteChunkSplit = (
  options: ChunkSplitOptions = {}
): PluginOption => {
  const viteRoot = searchForWorkspaceRoot(".");
  const cs = new ChunkSplit(resolve(viteRoot), options);

  return {
    name: "vite-presets/chunk-split",
    apply: "build",
    config(c) {
      c.build = c.build ?? {};

      const assetsDir = c.build.assetsDir ?? "assets";

      c.build.rollupOptions = c.build.rollupOptions ?? {};

      c.build.rollupOptions.output = c.build.rollupOptions.output ?? {} as OutputOptions;
      const chunkFileNames = get(c.build.rollupOptions.output, ["chunkFileNames"], `${assetsDir}/[name].[hash].chunk.js`);

      c.build.rollupOptions.output = {
        ...c.build.rollupOptions.output,
        chunkFileNames: (chunkInfo: PreRenderedChunk) => {
          if (chunkInfo.name.startsWith("lib-") || chunkInfo.name.startsWith("vendor-")) {
            return chunkFileNames;
          }
          const name = cs.extractName(chunkInfo.moduleIds[0]!).replaceAll("[", "_").replaceAll("]", "").replaceAll("/", "-");
          return `${assetsDir}/${name}.[hash].chunk.js`;
        }
      };
    },
    outputOptions(o) {
      o.manualChunks = (id: string, meta: ManualChunkMeta) => {
        return cs.chunkName(id, meta)?.replaceAll("/", "-").replaceAll("@", "");
      };
    }
  };
};

class ChunkSplit {
  private readonly libRoot: string[];
  private readonly dependencies: Record<string, string>;

  constructor(private root: string, private options: ChunkSplitOptions) {
    this.libRoot = (options.libRoot ?? []).map((p) => {
      if (isAbsolute(p)) {
        return p;
      }
      return join(root, p);
    });

    this.dependencies = JSON.parse(String(readFileSync(join(root, "package.json")))).dependencies ?? {};
  }

  private _pkgRelegation?: ReturnType<typeof this.resolvePkgRelations>;

  pkgRelegation(meta: ManualChunkMeta, pkgName: string) {
    return (
      (this._pkgRelegation =
        this._pkgRelegation ?? this.resolvePkgRelations(meta))[pkgName]);
  }

  chunkName(id: string, meta: ManualChunkMeta): string | undefined {
    for (const r of this.libRoot) {
      if (id.startsWith(r)) {
        return this.pkgRelegation(meta, this.extractPkgName(id))?.federation;
      }
    }

    if (id.includes("node_modules") || id.startsWith("\0")) {
      return this.pkgRelegation(meta, this.extractPkgName(id))?.federation;
    }

    return;
  }

  private resolvePkgRelations({
                                getModuleInfo,
                                getModuleIds
                              }: ManualChunkMeta) {
    const directs: Record<string, boolean> = {};
    const moduleFederations: Record<string, ModuleFederation> = {};

    [...getModuleIds()].forEach((modID) => {
      const pkgName = this.extractPkgName(modID);

      if (pkgName) {
        const m = getModuleInfo(modID)!;

        [
          ...m.importedIds,
          ...m.dynamicallyImportedIds
        ]
          .map((p) => this.extractPkgName(p))
          .filter((v) => v !== pkgName)
          .forEach((dep) => {
            const moduleFederation = (moduleFederations[dep] = moduleFederations[dep] ?? new ModuleFederation(dep));
            moduleFederation.importedBy(pkgName);
          });

        return;
      }

      getModuleInfo(modID)
        ?.importedIds.map((p) => this.extractPkgName(p))
        .filter((v) => v !== pkgName)
        .forEach((p) => {
          directs[p] = true;
        });
    });


    for (const pkgName in directs) {
      if (pkgName.startsWith("@lib")) {
        continue;
      }

      if (pkgName.startsWith("vendor-")) {
        if (!this.dependencies[pkgName.slice("vendor-".length)]) {
          delete directs[pkgName];
        }
        continue;
      }

      if (!this.dependencies[pkgName]) {
        delete directs[pkgName];
      }
    }


    markPkgRelegation(moduleFederations, directs);

    this.options.handleModuleFederations && this.options.handleModuleFederations(moduleFederations);

    return moduleFederations;
  }

  extractName(id: string): string {
    if (id.startsWith(this.root)) {
      return dirname(id.slice(this.root.length + 1));
    }
    return this.extractPkgName(id);
  }

  private extractPkgName(id: string): string {
    for (const r of this.libRoot) {
      if (id.startsWith(r)) {
        return `@lib/${dirname(id.slice(r.length + 1))}`;
      }
    }

    const parts = id.split("/node_modules/");

    if (parts.length === 1) {
      if (id) {
        // vite or rollup helpers
        if (id[0] === "\0") {
          if (/react/.test(id)) {
            return "react";
          }
          return "@internal";
        }
        if (id[0] !== "/") {
          return id.split("/")[0]!;
        }
      }
      return "";
    }

    const dirPaths = parts[parts.length - 1]!.split("/");

    if (dirPaths[0]![0] === "@") {
      return `vendor-${dirPaths[0]}/${dirPaths[1]}`;
    }

    return `vendor-${dirPaths[0]!}`;
  }
}

export class ModuleFederation {
  _federation?: string;
  _imported: Record<string, boolean> = {};

  constructor(public name: string) {
  }

  get federation() {
    return this._federation ?? this.name;
  }

  importedBy(name: string) {
    this._imported[name] = true;
  }

  namesOfImported() {
    return Object.keys(this._imported);
  }

  isImportedBy(target: string) {
    return this._imported[target];
  }

  bindFederation(federation: string) {
    this._federation = federation;
  }
}


const markPkgRelegation = (
  moduleFederations: Record<string, ModuleFederation>,
  directs: Record<string, boolean>
) => {
  const ordered = (imported: string[]) => {
    return imported.sort((a, b) => {
      return moduleFederations[a]?.isImportedBy(b) ? -1 : 1;
    });
  };

  const federations: Record<string, boolean> = {};

  for (const targetPkg in moduleFederations) {
    let federation = targetPkg;

    while (!directs[federation]) {
      const pkgRelation = moduleFederations[federation]!;

      if (pkgRelation) {
        federation = ordered(pkgRelation.namesOfImported())[0]!;
        continue;
      }
      break;
    }

    moduleFederations[targetPkg]?.bindFederation(federation);
    federations[federation] = true;
  }

  for (const federation in federations) {
    if (!moduleFederations[federation]) {
      moduleFederations[federation] = new ModuleFederation(federation);
    }
  }
};


export const d2Graph = (moduleFederations: Record<string, ModuleFederation>) => {
  let g = "";

  const pkgId = (pkgName: string) => {
    return pkgName.replaceAll("@", "").replaceAll("/", "-");
  };

  const r = (pkgName: string) => {
    if (moduleFederations[pkgName]) {
      return `${pkgId(moduleFederations[pkgName]!.federation)}.${pkgId(pkgName)}`;
    }
    return `${pkgId(pkgName)}`;
  };

  for (const pkgName in moduleFederations) {
    const pkgRelation = moduleFederations[pkgName]!;
    for (const d of pkgRelation.namesOfImported()) {
      g += `${r(pkgName)} -> ${r(d)}      
`;
    }
  }

  return g;
};