import { dirname, join, relative } from "path";
import { load } from "js-yaml";
import { globby } from "globby";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { map, get, keys } from "@innoai-tech/lodash";

const imlFromPackageJSON = (rpath: string, pkg: any) => {
	return join(rpath, `${pkg.name.replace("/", "__")}.iml`);
};

const patchRootPackage = async (
	projectRoot: string,
	pkgs: { [k: string]: any },
) => {
	await writeFile(
		join(projectRoot, ".idea/modules.xml"),
		`<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectModuleManager">
    <modules>
${map(pkgs, (pkg, dir) => {
	const filename = join(
		"$PROJECT_DIR$",
		imlFromPackageJSON(relative(projectRoot, dir), pkg),
	);
	return `<module fileurl="file://${filename}" filepath="${filename}" />`;
}).join("\n")}
    </modules>
  </component>
</project>
`,
	);
};

const defaultScripts = {
	lint: "rome check --apply-suggested ./src && rome format --write ./src",
	test: "vitest --run --passWithNoTests",
	build: "monobundle",
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
		...keys(o).sort(),
	].forEach((k) => {
		v[k] = o[k];
	});

	return v;
};

const patchMonoPackage = async (
	monoRoot: string,
	directory: string,
	pkg: any,
	rootPkg: any,
) => {
	const scripts = {
		...(pkg.scripts || {}),
	};

	if (get(pkg, ["monobundle"])) {
		scripts.lint = get(
			pkg,
			["monobundle", "pipeline", "lint"],
			defaultScripts.lint,
		);
		scripts.build =
			get(pkg, ["monobundle", "pipeline", "build"], defaultScripts.build) ||
			undefined;
		scripts.test =
			get(pkg, ["monobundle", "pipeline", "test"], defaultScripts.test) ||
			undefined;
		scripts.prepublishOnly = scripts.build ? "pnpm run build" : undefined;
	}

	await writeFile(
		join(monoRoot, "package.json"),
		`${JSON.stringify(
			orderKeys({
				...pkg,
				scripts,
				type: "module",
				license: "MIT",
				repository: rootPkg.repository
					? {
							...rootPkg.repository,
							directory,
					  }
					: undefined,
				publishConfig:
					!pkg.private && rootPkg.publishConfig
						? {
								...rootPkg.publishConfig,
						  }
						: undefined,
			}),
			null,
			2,
		)}`,
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
      <excludeFolder url="file://$MODULE_DIR$/node_modules" />
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
</module>`,
	);
};

export const bootstrap = async (projectRoot: string) => {
	if (process.env["CI"] && process.env["CI"] !== "0") {
		return;
	}

	const workspace = load(
		String(await readFile(join(projectRoot, "pnpm-workspace.yaml"))),
	) as {
		packages: string[];
	};

	const packageJsonFiles = await globby([
		`${projectRoot}/package.json`,
		...workspace.packages.map((p) => `${p}/package.json`),
	], {
		cwd: projectRoot,
		absolute: true,
	});

	const packages: { [k: string]: any } = {};

	for (const p of packageJsonFiles) {
		const packageJSON = JSON.parse(String(await readFile(p)));

		const monoRoot = dirname(p);
		const rpath = relative(projectRoot, monoRoot);

		packages[rpath] = packageJSON;

		if (rpath) {
			await patchMonoPackage(monoRoot, rpath, packageJSON, packages[""]);
		}

		await addImiFile(monoRoot, packageJSON);
	}

	await patchRootPackage(projectRoot, packages);
};
