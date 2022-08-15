import { dirname, join, relative } from "path";
import { load } from "js-yaml";
import { globby } from "globby";
import { readFile, writeFile } from "fs/promises";

// create *.iml for each mono package and root package
// then update to .idea/modules.xml
export const bootstrap = async (cwd: string) => {
	if (process.env["CI"] && process.env["CI"] !== "0") {
		return;
	}

	const w = load(String(await readFile(join(cwd, "pnpm-workspace.yaml")))) as {
		packages: string[];
	};
	const paths = await globby([
		`${cwd}/package.json`,
		...w.packages.map((p) => `${p}/package.json`),
	], {
		cwd: cwd,
		absolute: true,
	});

	const imls = [];

	for (const p of paths) {
		const dir = dirname(p);
		const n = (
			JSON.parse(String(await readFile(p))) as { name: string }
		).name.replace("/", "__");

		imls.push(join("$PROJECT_DIR$", relative(cwd, dir), `${n}.iml`));

		await writeFile(
			join(dir, `${n}.iml`),
			`<?xml version="1.0" encoding="UTF-8"?>
<module type="WEB_MODULE" version="4">
  <component name="NewModuleRootManager" inherit-compiler-output="true">
    <exclude-output />
    <content url="file://$MODULE_DIR$">
      <sourceFolder url="file://$MODULE_DIR$" isTestSource="false" />
      <excludeFolder url="file://$MODULE_DIR$/.turbo" />
      <excludeFolder url="file://$MODULE_DIR$/.tmp" />
      <excludeFolder url="file://$MODULE_DIR$/.build" />
      <excludeFolder url="file://$MODULE_DIR$/dist" />
      <excludeFolder url="file://$MODULE_DIR$/node_modules" />
      <excludeFolder url="file://$MODULE_DIR$/cue.mod/gen" />
      <excludeFolder url="file://$MODULE_DIR$/cue.mod/pkg" />
    </content>
    <orderEntry type="sourceFolder" forTests="false" />
  </component>
</module>`,
		);
	}

	await writeFile(
		join(cwd, ".idea/modules.xml"),
		`<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectModuleManager">
    <modules>
      ${imls.map(
			(iml) => `<module fileurl="file://${iml}" filepath="${iml}" />`,
		).join("\n")}
    </modules>
  </component>
</project>
`,
	);
};
