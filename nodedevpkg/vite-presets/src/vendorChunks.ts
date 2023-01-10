import type {ManualChunkMeta} from "rollup";
import {uniq} from "@innoai-tech/lodash";
import type {Plugin} from "vite";
import minimatch from "minimatch";

export const resolvePkgEntryOwners = (entries: string[], usedBy: { [k: string]: string[] }) => {
    const entryOwners: { [k: string]: string } = {}

    const orderByUsed = (used: string[]) => {
        return used.sort((a, b) => {
            return (usedBy[a] || []).includes(b) ? -1 : 1
        })
    }

    for (const p in usedBy) {
        let pkgName = p

        while (!entries.includes(pkgName)) {
            const used = usedBy[pkgName]

            if (used && used.length > 0) {
                pkgName = orderByUsed(used)[0]!
            } else {
                break;
            }
        }

        if (pkgName !== p) {
            entryOwners[p] = pkgName
        }
    }

    for (const entry of entries) {
        entryOwners[entry] = ""
    }


    return entryOwners
}

export type ChunksGroups = { [name: string]: string[] };

const pkgTest = (pkgName: string, patterns: string[] = []) => {
    if (!!patterns) {
        for (const p of patterns) {
            if (minimatch(pkgName, p)) {
                return true
            }
        }
    }
    return false
}

/**
 * split vendor to multiple vendor files vendor~[name].[hash].js
 */
export const vendorChunks = (vendorGroups: ChunksGroups = {}): Plugin => {
    const cache = new Map();

    const vendorGroupName = (pkgName: string) => {
        if (pkgTest(pkgName, ["__internal", "core-js", "tslib", "object-assign"])) {
            return "runtime"
        }

        for (const groupKey in vendorGroups) {
            if (pkgTest(pkgName, vendorGroups[groupKey])) {
                return groupKey;
            }
        }

        return ""
    }

    const vendorPkgName = (id: string): string => {
        const parts = id.split("/node_modules/");
        if (parts.length === 1) {
            if (id) {
                // vite or rollup helpers
                if (id[0] === "\0") {
                    if (/react/.test(id)) {
                        return "react";
                    }
                    return "__internal";
                }
                if (id[0] !== "/") {
                    return id.split("/")[0]!;
                }
            }
            return "";
        }

        const dirPaths = parts[parts.length - 1]!.split("/");

        if (dirPaths[0]![0] === "@") {
            return `${dirPaths[0]}/${dirPaths[1]}`;
        }

        return dirPaths[0]!;
    };

    let pkgEntryOwners: { [k: string]: string };

    const splitVendorChunk = (
        id: string,
        {getModuleInfo, getModuleIds}: ManualChunkMeta
    ) => {
        if (!pkgEntryOwners) {
            const usedBy: { [k: string]: string[] } = {};
            const directs: { [k: string]: boolean } = {"__internal": true};

            [...getModuleIds()].forEach((k) => {
                const pkgName = vendorPkgName(k);

                if (pkgName) {
                    const m = getModuleInfo(k)!;

                    [...m.importedIds, ...m.dynamicallyImportedIds]
                        .map((p) => vendorPkgName(p))
                        .filter((v) => v && v !== pkgName)
                        .forEach((dep) => {
                            usedBy[dep] = uniq([
                                ...(usedBy[dep] || ([] as string[])),
                                pkgName,
                            ]);
                        });

                    return;
                }

                getModuleInfo(k)
                    ?.importedIds.map((p) => vendorPkgName(p))
                    .filter((v) => v && v !== pkgName)
                    .forEach((p) => {
                        directs[p] = true;
                    });
            });

            pkgEntryOwners = resolvePkgEntryOwners(Object.keys(directs), usedBy)
        }

        if (cache.has(id)) {
            return cache.get(id);
        }

        let pkgName = vendorPkgName(id);

        if (!!pkgEntryOwners[pkgName]) {
            pkgName = pkgEntryOwners[pkgName]!
        }

        const groupName = vendorGroupName(pkgName)
        if (groupName !== "") {
            pkgName = groupName
        }

        const name = `vendor~${pkgName.replace("/", "--")}`;
        cache.set(id, name);
        return name;
    };

    return {
        name: "vite-presets/vendor-chunks",

        outputOptions(o) {
            o.manualChunks = ((id: string, meta: ManualChunkMeta) => {
                if (id.includes("node_modules") || id.startsWith("\0")) {
                    return splitVendorChunk(id, meta);
                }
                return null;
            }) as any;
            return o;
        },
    };
};
