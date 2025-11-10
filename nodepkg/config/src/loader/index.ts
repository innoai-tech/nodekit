import * as vm from "node:vm";
import { createContext } from "node:vm";
import { isFunction, kebabCase, mapValues, toMerged } from "es-toolkit";
import type {
  AppConfig,
  AppConfigMetadata,
  AppContext,
  ConfigBuilder,
} from "../config";
import { rolldown } from "rolldown";

export const loadConfig = async (configFile: string) => {
  const rd = await rolldown({
    input: [configFile],
  });

  const ret = await rd.generate({ format: "cjs", exports: "named" });

  const script = new vm.Script(ret.output[0]?.code);

  const ctx = {
    exports: {},
    process: process,
  };

  script.runInContext(createContext(ctx));

  const conf = ctx.exports as { CONFIG: any };

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
            let apiMetaData = {};

            for (const apiPrefix of ["API_", "SRV_"]) {
              if (name.startsWith(apiPrefix)) {
                const apiName = kebabCase(name.slice(apiPrefix.length));

                apiMetaData = toMerged(apiMetaData, {
                  api: {
                    id: apiName,
                    openapi: `/api/${apiName}`,
                  },
                });
                break;
              }
            }

            if ((fnOrValue as any).api) {
              for (const [k, v] of Object.entries((fnOrValue as any).api)) {
                apiMetaData = toMerged(apiMetaData, {
                  api: {
                    [`${k}`]: v,
                  },
                });
              }
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
