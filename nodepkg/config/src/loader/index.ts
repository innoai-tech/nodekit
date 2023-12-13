import * as vm from "vm";
import { createContext } from "vm";
import {
	forEach,
	isFunction,
	kebabCase,
	mapValues,
	set,
	startsWith,
} from "@innoai-tech/lodash";
import { build } from "esbuild";
import type {
	AppConfig,
	AppConfigMetadata,
	AppContext,
	ConfigBuilder,
} from "../config";

export const loadConfig = async (configFile: string) => {
	const ret = await build({
		entryPoints: [configFile],
		format: "cjs",
		outfile: "config.json",
		sourcemap: false,
		bundle: true,
		splitting: false,
		globalName: "conf",
		write: false,
	});

	const ctx = {
		module: {
			exports: {},
		},
	};

	vm.runInContext(String(ret.outputFiles[0]?.text), createContext(ctx));

	const conf = ctx.module.exports as { CONFIG: any };

	return (
		configCtx: AppContext,
	): AppContext & AppConfig & AppConfigMetadata => {
		return {
			...conf.CONFIG,
			config: mapValues(
				conf.CONFIG.config,
				(fnOrValue: ConfigBuilder | string) =>
					isFunction(fnOrValue) ? fnOrValue(configCtx) : fnOrValue,
			),
			metadata: mapValues(
				conf.CONFIG.config,
				(fnOrValue: ConfigBuilder | string, name: string) => {
					if (isFunction(fnOrValue)) {
						const apiMetaData = {};

						for (const apiPrefix of ["API_", "SRV_"]) {
							if (startsWith(name, apiPrefix)) {
								const apiName = kebabCase(name.slice(apiPrefix.length));

								set(apiMetaData, ["api", "id"], apiName);
								set(apiMetaData, ["api", "openapi"], `/api/${apiName}`);
								break;
							}
						}

						if ((fnOrValue as any).api) {
							forEach((fnOrValue as any).api, (v, k) => {
								set(apiMetaData, ["api", k], v);
							});
						}

						return apiMetaData;
					}
					return {};
				},
			),
			env: configCtx.env,
			feature: configCtx.feature,
		};
	};
};
