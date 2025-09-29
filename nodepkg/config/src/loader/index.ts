import * as vm from "node:vm";
import { createContext } from "node:vm";
import { forEach, isFunction, kebabCase, mapValues, set, startsWith } from "@innoai-tech/lodash";
import type { AppConfig, AppConfigMetadata, AppContext, ConfigBuilder } from "../config";
import { rolldown } from "rolldown";

export const loadConfig = async (configFile: string) => {
  const rd = await rolldown({
    input: [configFile]
  });

  const ret = await rd.generate({ format: "cjs", exports: "named" });

  const script = new vm.Script(ret.output[0]?.code);

  const ctx = {
    exports: {},
    process: process
  };

  script.runInContext(createContext(ctx));

  const conf = ctx.exports as { CONFIG: any };

  return (
    configCtx: AppContext
  ): AppContext & AppConfig & AppConfigMetadata => {
    return {
      ...conf.CONFIG,
      config: mapValues(
        conf.CONFIG.config,
        (fnOrValue: ConfigBuilder | string) =>
          isFunction(fnOrValue) ? fnOrValue(configCtx) : fnOrValue
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
        }
      ),
      env: configCtx.env,
      feature: configCtx.feature
    };
  };
};
