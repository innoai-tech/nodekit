import { nodeResolve } from "@rollup/plugin-node-resolve";
import { existsSync } from "fs";
import {
	isEmpty,
	mapKeys,
	mapValues,
	trimStart,
	startsWith,
	keys,
	forEach,
	set,
} from "@innoai-tech/lodash";
import { join, relative, extname, basename, dirname } from "path";
import { OutputOptions, rollup, RollupOptions } from "rollup";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import { getBuildTargets } from "./getTarget";
import { createAutoExternal } from "./autoExternal";
import { createLogger } from "./log";
import { tsc } from "./tsc";
import { writeFile, readFile, unlink } from "fs/promises";
import { bootstrap } from "./bootstrap";
import { globby } from "globby";

const resolveProjectRoot = (p: string): string => {
	const pnpmWorkspaceYAML = join(p, "./pnpm-workspace.yaml");

	if (!existsSync(pnpmWorkspaceYAML)) {
		return resolveProjectRoot(join(p, "../"));
	}

	return p;
};

const entryAlias = (entry: string) => {
	if (entry === ".") {
		return "index";
	}
	if (startsWith(entry, "bin:")) {
		return entry.slice(4);
	}
	return trimStart(entry, "./");
};

type ResolveRollupOptions = () => Promise<RollupOptions>;

export interface MonoBundleOptions {
	pipeline: {
		lint: string | boolean;
		test: string | boolean;
		build: string | boolean;
	};
	exports: { [k: string]: string };
}

export const bundle = async ({ cwd = process.cwd(), dryRun }: {
	cwd?: string;
	dryRun?: boolean;
}) => {
	const projectRoot = resolveProjectRoot(cwd);

	if (projectRoot === cwd) {
		return await bootstrap(cwd);
	}

	const pkg = JSON.parse(String(await readFile(join(cwd, "package.json")))) as {
		[k: string]: any;
	};

	// skip if monobundle not defined
	if (!(pkg["monobundle"] && pkg["monobundle"].exports)) {
		return;
	}

	await writeFile(
		join(cwd, ".gitignore"),
		`
.turbo/
target/
dist/
*.mjs
*.d.ts
`,
	);

	const options: MonoBundleOptions = pkg["monobundle"] || {};

	const logger = createLogger(pkg["name"]);

	const inputs = mapValues(
		mapKeys(options.exports, (_, k) => {
			return entryAlias(k);
		}),
		(entry, _) => join(cwd, entry),
	);

	const outputBase: OutputOptions = {
		dir: cwd,
		format: "es",
	};

	const autoExternal = createAutoExternal(projectRoot, pkg, { logger });

	const buildTargets = getBuildTargets(
		(pkg as any).browserslist ?? ["defaults"],
	);

	const resolveRollupOptions: ResolveRollupOptions[] = [
		() =>
			Promise.resolve({
				input: inputs,
				output: {
					...outputBase,
					entryFileNames: "[name].mjs",
					chunkFileNames: "[name]-[hash].mjs",
				},
				plugins: [
					autoExternal(),
					nodeResolve({
						extensions: [".ts", ".tsx", ".mjs", "", ".js", ".jsx"],
					}),
					esbuild({
						target: buildTargets,
						tsconfig: "tsconfig.json",
						jsx: "automatic",
						loaders: {
							".json": "json",
						},
					}),
				],
			}),

		async () => {
			await tsc(cwd, ".turbo/types");

			const indexForDts = mapValues(inputs, (input) => {
				const f = join(cwd, ".turbo/types", relative(join(cwd, "src"), input));
				return `${join(dirname(f), basename(f, extname(f)))}.d.ts`;
			});

			return {
				input: indexForDts,
				output: {
					...outputBase,
					entryFileNames: "[name].d.ts",
					chunkFileNames: "[name]-[hash].d.ts",
				},
				plugins: [
					autoExternal(false),
					dts({
						respectExternal: true,
					}) as any,
				],
			};
		},
	];

	logger.warning(`bundling (target: ${buildTargets})`);

	let outputFiles: { [k: string]: boolean } = {};

	for (const resolveRollupOption of resolveRollupOptions) {
		const rollupOption = await resolveRollupOption();

		const files = await rollup(rollupOption).then((bundle) => {
			return Promise.all(
				([] as OutputOptions[]).concat(rollupOption.output!).map((output) => {
					if (dryRun) {
						return [];
					}
					return bundle.write(output).then((ret) => {
						if (output.dir) {
							return (ret.output || []).map(
								(o) => join(relative(cwd, output.dir!), o.fileName),
							);
						}
						return relative(cwd, output.file!);
					});
				}),
			);
		});

		files.flat().forEach((f) => {
			outputFiles[f] = true;
		});
	}

	logger.success("bundled", ...keys(outputFiles));

	const files = await globby(["*.mjs", "*.d.ts"]);

	for (const f of files) {
		if (outputFiles[f]) {
			continue;
		}
		await unlink(join(cwd, f));
	}

	const unused = autoExternal.warningAndGetUnused();

	for (const dep in unused.peerDeps) {
		pkg["peerDependencies"][dep] = undefined;
	}

	for (const dep in unused.deps) {
		pkg["dependencies"][dep] = undefined;
	}

	const exports = {
		type: "module",
		bin: undefined,
		exports: undefined,
		// FIXME remote all old entries
		types: undefined,
		main: undefined,
		module: undefined,
	};

	forEach(options.exports, (_, e) => {
		const distName = entryAlias(e);

		if (startsWith(e, "bin:")) {
			set(exports, ["bin", distName], `./${distName}.mjs`);
			return;
		}

		set(exports, ["exports", e], {
			import: {
				types: `./${distName}.d.ts`,
				default: `./${distName}.mjs`,
			},
		});
	});

	await writeFile(
		join(cwd, "package.json"),
		JSON.stringify(
			{
				...pkg,
				dependencies: isEmpty(pkg["dependencies"]) ? undefined : (
					pkg["dependencies"] as { [k: string]: string }
				),
				peerDependencies: isEmpty(pkg["peerDependencies"]) ? undefined : (
					pkg["peerDependencies"] as { [k: string]: string }
				),
				devDependencies: isEmpty(pkg["devDependencies"]) ? undefined : (
					pkg["devDependencies"] as { [k: string]: string }
				),
				files: ["*.mjs", "*.d.ts"],
				...exports,
			},
			null,
			2,
		),
	);

	return;
};
