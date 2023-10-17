import { writeFile } from "fs/promises";

export const writeFormattedJsonFile = async (path: string, v: any) => {
  return await writeFile(path, JSON.stringify(v, null, 2) + "\n");
};
