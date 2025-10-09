import { startsWith, trimStart } from "es-toolkit/compat";
import { writeFile } from "fs/promises";

export const writeFormattedJsonFile = async (path: string, v: any) => {
  return await writeFile(path, `${JSON.stringify(v, null, 2)}\n`);
};

export const entryAlias = (entry: string) => {
  if (entry === ".") {
    return "index";
  }
  if (startsWith(entry, "bin:")) {
    return entry.slice(4);
  }
  return trimStart(entry, "./");
};

export interface MonoBundleOptions {
  pipeline: {
    lint: string | boolean;
    test: string | boolean;
    build: string | boolean;
  };
  engine?: string;
  exports: { [k: string]: string };
  sideDeps: { [k: string]: string };
}
