import { existsSync } from "fs";
import { join } from "path";
import { load as loadYAML } from "js-yaml";
import { readFile } from "fs/promises";

export interface ProjectManager {
  isProjectRoot: (p: string) => boolean;
  workspaces: (p: string) => Promise<string[]>;
  defaults: () => {
    scripts: {
      build: string;
      lint: string;
      test: string;
    };
  };
}

const projectManagers: { [name: string]: ProjectManager } = {
  pnpm: {
    isProjectRoot: (p: string) => {
      return existsSync(join(p, "./pnpm-workspace.yaml"));
    },
    workspaces: async (root: string) => {
      const workspaceConfig = loadYAML(
        String(await readFile(join(root, "./pnpm-workspace.yaml"))),
      ) as { packages?: string[] };

      return workspaceConfig.packages ?? [];
    },
    defaults: () => {
      return {
        scripts: {
          build: "monobundle",
          lint: "prettier --write .",
          test: "vitest --run --passWithNoTests --dir .",
        },
      };
    },
  },
  bun: {
    isProjectRoot: (p: string) => {
      return (
        existsSync(join(p, "./.bunfig.toml")) ||
        existsSync(join(p, "./bun.lockb"))
      );
    },
    workspaces: async (root: string) => {
      const packageJSON = JSON.parse(
        String(await readFile(join(root, "./package.json"))),
      ) as { workspaces?: string[] };

      return packageJSON.workspaces ?? [];
    },
    defaults: () => {
      return {
        scripts: {
          build: "bunx monobundle",
          lint: "bunx prettier --write .",
          test: "bun test .",
        },
      };
    },
  },
};

export interface Project {
  root: string;
  pm: ProjectManager;
}

export const resolveProjectRoot = (p: string): Project | null => {
  for (const name in projectManagers) {
    const pm = projectManagers[name]!;
    if (pm.isProjectRoot(p)) {
      return {
        root: p,
        pm: pm,
      };
    }
  }
  if (existsSync(join(p, ".git"))) {
    return null;
  }
  return resolveProjectRoot(join(p, "../"));
};
