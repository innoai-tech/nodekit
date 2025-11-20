import { existsSync } from "fs";
import { join } from "path";
import { readFile } from "fs/promises";
import { load as loadYAML } from "js-yaml";

export interface ProjectManager {
  bin: {
    main: string;
    run: string;
    exec: string;
  };
  isProjectRoot: (p: string) => boolean;
  workspaces: (p: string) => Promise<string[]>;
  defaults: () => {
    scripts: {
      build?: string;
    };
  };
}

const projectManagers: { [name: string]: ProjectManager } = {
  bun: {
    bin: {
      main: "bun",
      run: "bun run",
      exec: "bunx"
    },
    isProjectRoot: (p: string) => {
      return (
        existsSync(join(p, "./bun.lock")) || existsSync(join(p, "./bunfig.toml"))
      );
    },
    workspaces: async (root: string) => {
      const packageJSON = JSON.parse(
        String(await readFile(join(root, "./package.json")))
      ) as { workspaces?: string[] };

      return packageJSON.workspaces ?? [];
    },
    defaults: () => {
      return {
        scripts: {
          build: "bunx --bun @innoai-tech/monobundle"
        }
      };
    }
  },
  pnpm: {
    bin: {
      main: "pnpm",
      run: "pnpm run",
      exec: "pnpm exec"
    },
    isProjectRoot: (p: string) => {
      return existsSync(join(p, "./pnpm-workspace.yaml"));
    },
    workspaces: async (root: string) => {
      const workspaceConfig = loadYAML(
        String(await readFile(join(root, "./pnpm-workspace.yaml")))
      ) as { packages?: string[] };

      return workspaceConfig.packages ?? [];
    },
    defaults: () => {
      return {
        scripts: {
          build: "monobundle"
        }
      };
    }
  }
};

export interface Project {
  root: string;
  pm: ProjectManager;
}

export const resolveProjectRoot = (p: string): Project | null => {
  for (const name in projectManagers) {
    const pm = projectManagers[name] as ProjectManager;
    if (pm.isProjectRoot(p)) {
      return {
        root: p,
        pm: pm
      };
    }
  }
  if (existsSync(join(p, ".git"))) {
    return null;
  }
  return resolveProjectRoot(join(p, "../"));
};
