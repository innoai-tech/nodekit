import { merge } from "@innoai-tech/lodash";
import { Options, transform } from "@swc/core";
import { dirname } from "path";
import type { Plugin } from "vite";
import { loadTsConfig } from "load-tsconfig";
import { createFilter } from "@rollup/pluginutils";

export type SWCOptions = Options;

export const swc = (swcOptions: SWCOptions = {}): Plugin => {
	const filter = createFilter(/\.[jt]sx?$/, /node_modules/);

	const opts: Options = merge(
		{
			jsc: {
				parser: {
					syntax: "typescript",
					tsx: true,
					dynamicImport: true,
				},
				transform: {
					react: {
						runtime: "automatic",
						development: true,
						useBuiltins: false,
					},
				},
				target: "es2022",
			},
			env: null,
			minify: false,
		},
		swcOptions,
	);

	return {
		name: "vite-presets/swc",
		config(c, build) {
			if (build.command === "build") {
				opts.minify = false;
				opts.jsc!.transform!.react!.development = false;
				opts.jsc!.externalHelpers = false;

				// FIXME core-js-pure not supported
				// https://github.com/swc-project/swc/issues/5584
				opts.env = {
					targets: ["defaults"],
					mode: "usage",
					dynamicImport: true,
					coreJs: "3.24",
					shippedProposals: true,
				};
			} else if (build.command === "serve") {
				// disable esbuild when dev
				c.esbuild = false;
			}
		},
		transform: async (code, id) => {
			if (!filter(id)) {
				return null;
			}

			const compilerOptions =
				loadTsConfig(dirname(id), "tsconfig.json")?.data?.compilerOptions || {};

			if (compilerOptions.jsx) {
				opts.jsc!.transform!.react = {
					...opts.jsc!.transform!.react,
					pragma: compilerOptions.jsxFactory,
					pragmaFrag: compilerOptions.jsxFragmentFactory,
					importSource: compilerOptions.jsxImportSource,
				};
			}

			if (compilerOptions.target) {
				opts.jsc!.target = compilerOptions.target;
			}

			const ret = await transform(code, {
				...opts,
				filename: id,
				sourceMaps: true,
			});

			return {
				code: ret.code,
				map: ret.map && JSON.parse(ret.map),
			};
		},
	};
};
