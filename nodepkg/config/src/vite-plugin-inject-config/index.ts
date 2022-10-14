import { AppConfig, AppConfigMetadata, AppContext, stringify } from "../";
import type { Plugin, UserConfig } from "vite";
import { loadConfig } from "../loader";
import { join } from "path";

export type HandleConfig =
  | ((c: UserConfig, ctx: AppConfig & AppContext & AppConfigMetadata) => void)
  | ((
      c: UserConfig,
      ctx: AppConfig & AppContext & AppConfigMetadata
    ) => Promise<void>);

export const injectWebAppConfig = (onConfig?: HandleConfig): Plugin => {
  let injectEnabled = false;
  let conf: (AppConfig & AppContext & AppConfigMetadata) | null = null;
  let appEnv = (process.env as any).APP_ENV || "local";
  let appVersion = (process.env as any).APP_VERSION || "0.0.0";
  let appFeature = (process.env as any).APP_FEATURE || "";

  return {
    name: "vite-plugin/inject-config",
    async config(c, ce) {
      injectEnabled = ce.command === "build";
      conf = (await loadConfig(join(c.root!, "config.ts")))({
        env: injectEnabled ? "$" : appEnv,
        feature: appFeature,
      });
      if (onConfig) {
        onConfig(c, conf);
      }
    },
    transformIndexHtml(html) {
      return {
        html: html,
        tags: [
          {
            tag: "meta",
            attrs: {
              name: "webapp:base",
              content: stringify({
                name: conf!.name,
                env: injectEnabled ? "__ENV__" : appEnv,
                version: appVersion,
              }),
            },
          },
          {
            tag: "meta",
            attrs: {
              name: "webapp:config",
              content: injectEnabled
                ? "__APP_CONFIG__"
                : stringify(conf!.config as any),
            },
          },
        ],
      };
    },
  };
};
