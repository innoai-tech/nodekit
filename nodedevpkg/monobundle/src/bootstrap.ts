import { dirname, join, relative } from "path";
import { globby } from "globby";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { map, get, keys } from "@innoai-tech/lodash";
import type { Project } from "./pm";
import { entryAlias, type MonoBundleOptions, writeFormattedJsonFile } from "./util";
import { forEach, set, startsWith } from "@innoai-tech/lodash";

const imlFromPackageJSON = (rpath: string, pkg: any) => {
  return join(rpath, `${pkg.name.replace("/", "__")}.iml`);
};

const patchRootPackage = async (
  project: Project,
  pkgs: { [k: string]: any }
) => {
  await writeFile(
    join(project.root, ".idea/modules.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectModuleManager">
    <modules>
${map(pkgs, (pkg, dir) => {
      const filename = join(
        "$PROJECT_DIR$",
        imlFromPackageJSON(relative(project.root, dir), pkg)
      );
      return `<module fileurl="file://${filename}" filepath="${filename}" />`;
    }).join("\n")}
    </modules>
  </component>
</project>
`
  );
};

const orderKeys = (o: any) => {
  const v: any = {};

  [
    "name",
    "version",
    "monobundle",
    "dependencies",
    "peerDependencies",
    "devDependencies",
    ...keys(o).sort()
  ].forEach((k) => {
    v[k] = o[k];
  });

  return v;
};

const getExportsAndBin = (options?: MonoBundleOptions) => {
  const pkg = {} as { bin?: {}, exports?: {} };

  forEach(options?.exports, (entryFile, e) => {
    const distName = entryAlias(e);

    if (startsWith(e, "bin:")) {
      set(pkg, ["bin", distName], `./${distName}.mjs`);
      return;
    }

    set(pkg, ["exports", e], {
      // bun must on first
      bun: entryFile,
      import: {
        types: `./${distName}.d.ts`,
        default: `./${distName}.mjs`
      }
    });
  });

  return pkg;
};

const patchMonoPackage = async (
  project: Project,
  monoRoot: string,
  directory: string,
  pkg: any,
  rootPkg: any
) => {
  const defaultScripts = project.pm.defaults().scripts;

  const scripts = {
    ...(pkg.scripts || {})
  };

  if (get(pkg, ["monobundle"])) {
    scripts.lint = get(
      pkg,
      ["monobundle", "pipeline", "lint"],
      defaultScripts.lint
    );
    scripts.build =
      get(pkg, ["monobundle", "pipeline", "build"], defaultScripts.build) ||
      undefined;
    scripts.test =
      get(pkg, ["monobundle", "pipeline", "test"], defaultScripts.test) ||
      undefined;
    scripts.prepublishOnly = scripts.build
      ? `${project.pm.bin.run} build`
      : undefined;
  }

  const exportsAndBin = getExportsAndBin(get(pkg, ["monobundle"]));

  await writeFormattedJsonFile(
    join(monoRoot, "package.json"),
    orderKeys({
      ...pkg,
      ...exportsAndBin,
      scripts,
      type: "module",
      license: "MIT",
      repository: rootPkg.repository
        ? {
          ...rootPkg.repository,
          directory
        }
        : undefined,
      publishConfig:
        !pkg.private && rootPkg.publishConfig
          ? {
            ...rootPkg.publishConfig
          }
          : undefined
    })
  );
};

export const addImiFile = async (monoRoot: string, pkg: any) => {
  const isGoMod = existsSync(join(monoRoot, "go.mod"));
  const isCueMod = existsSync(join(monoRoot, "cue.mod"));

  await writeFile(
    join(monoRoot, `${imlFromPackageJSON("", pkg)}`),
    `<?xml version="1.0" encoding="UTF-8"?>
<module type="WEB_MODULE" version="4">
  ${isGoMod ? `<component name="Go" enabled="true" />` : ""}
  <component name="NewModuleRootManager" inherit-compiler-output="true">
    <exclude-output />
    <content url="file://$MODULE_DIR$">
      <sourceFolder url="file://$MODULE_DIR$" isTestSource="false" />
      <excludeFolder url="file://$MODULE_DIR$/.turbo" />
      <excludeFolder url="file://$MODULE_DIR$/.tmp" />
      <excludeFolder url="file://$MODULE_DIR$/.build" />
      <excludeFolder url="file://$MODULE_DIR$/dist" />
      ${
      isCueMod
        ? `
      <excludeFolder url="file://$MODULE_DIR$/cue.mod/gen" />
      <excludeFolder url="file://$MODULE_DIR$/cue.mod/pkg" />
      `
        : ""
    }
    </content>
    <orderEntry type="sourceFolder" forTests="false" />
  </component>
</module>`
  );
};

export const bootstrap = async (project: Project) => {
  if (process.env["CI"] && process.env["CI"] !== "0") {
    return;
  }

  const workspaces = await project.pm.workspaces(project.root);

  const packageJsonFiles = await globby(
    [
      `${project.root}/package.json`,
      ...workspaces.map((p) => `${p}/package.json`)
    ],
    {
      cwd: project.root,
      absolute: true
    }
  );

  const packages: { [k: string]: any } = {};

  for (const p of packageJsonFiles) {
    const packageJSON = JSON.parse(String(await readFile(p)));

    const monoRoot = dirname(p);
    const rpath = relative(project.root, monoRoot);

    packages[rpath] = packageJSON;

    if (rpath) {
      await patchMonoPackage(
        project,
        monoRoot,
        rpath,
        packageJSON,
        packages[""]
      );
    }

    await addImiFile(monoRoot, packageJSON);
  }

  await patchRootPackage(project, packages);
};

