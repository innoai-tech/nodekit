import { parse } from "./configvalue";

export type BaseConfig = { name: string; env: string; version: string };

const getWebAppConfigValue = (key: string) => {
  return (
    (globalThis as any).document
      ?.querySelector(`meta[name="webapp:${key}"]`)
      ?.getAttribute("content") || ""
  );
};

const getAppBaseHref = () => {
  return (
    (globalThis as any).document?.querySelector("base")?.getAttribute("href") ||
    "/"
  );
};

export const confLoader = <TKeys extends string>() => {
  const base = parse(getWebAppConfigValue("base")) as BaseConfig;
  const config = parse(getWebAppConfigValue("config")) as {
    [key in TKeys]: string;
  };

  return () => {
    return {
      ...base,
      ...config,
      baseHref: getAppBaseHref(),
    };
  };
};

export interface AppContext {
  env: string;
  feature: string;
}

export type ConfigBuilder = (ctx: AppContext) => string;

export interface AppConfig {
  name: string;
  group: string;
  config: { [n: string]: ConfigBuilder | string };
  manifest: { [k: string]: string };
}

export interface AppConfigMetadata {
  metadata: {
    [n: string]: {
      api?: APIMetadata;
    };
  };
}

export interface APIMetadata {
  id?: string;
  openapi?: string;
}

export const api = (opt: APIMetadata = {}) => {
  return <T extends Function>(target: T) => {
    return Object.assign(target, {
      api: opt,
    });
  };
};
