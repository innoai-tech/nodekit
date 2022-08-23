import { readFile } from "fs/promises";
import fetch from "node-fetch";
import { genClientFromOpenAPI, RequestCreator } from "./gen";
import { join } from "path";
import { camelCase } from "@innoai-tech/lodash";
import type { AppConfig, AppConfigMetadata } from "@innoai-tech/config";

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

export const generateClients = async (
	outDir: string,
	c: AppConfig & AppConfigMetadata,
	requestCreator: Options["requestCreator"],
) => {
	for (const k in c.config) {
		if (c.metadata[k] && c.metadata[k]!.api) {
			const api = c.metadata[k]!.api!;
			const id = api.id!;
			const openapi = `${c.config[k]}${api.openapi}`;

			console.log(`generate client ${id} from ${openapi}`);

			await generateClient({
				id,
				uri: openapi,
				outDir,
				requestCreator: requestCreator,
				force: true,
			});
		}
	}
};
