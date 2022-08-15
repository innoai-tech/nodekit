import { readFile } from "fs/promises";
import fetch from "node-fetch";
import { genClientFromOpenAPI, RequestCreator } from "./gen";
import { join } from "path";
import { camelCase } from "@innoai-tech/lodash";

export interface Options {
	id: string;
	uri: string;
	outDir: string;
	requestCreator: RequestCreator;
	force: boolean;
}

const loadOpenAPI = async (uri: string): Promise<any> => {
	const u = new URL(uri);

	if (u.protocol === "files:") {
		const b = await readFile(u.pathname);
		return JSON.parse(`${b}`);
	}

	const res = await fetch(u.toString());
	return await res.json();
};

export const generateClient = async (opt: Options) => {
	const openapi = await loadOpenAPI(opt.uri);

	const f = genClientFromOpenAPI(opt.id, openapi, opt.requestCreator);

	return f.sync(join(opt.outDir, `${camelCase(opt.id)}.ts`));
};
