import { parse } from "./configvalue";

export type BaseConfig = { name: string; env: string; version: string };

const getWebAppConfigValue = (key: string) => {
  return (
    globalThis.document
      ?.querySelector(`meta[name="webapp:${key}"]`)
      ?.getAttribute("content") || ""
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
    (target as any).api = opt;
    return target;
  };
};
