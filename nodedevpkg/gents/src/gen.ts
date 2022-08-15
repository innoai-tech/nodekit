import { Genfile, dumpObj } from "./Genfile";
import {
	camelCase,
	first,
	values,
	lowerFirst,
	get,
	set,
	keys,
} from "@innoai-tech/lodash";
import { intersectionOf, typeFromJSONSchema, unionOf } from "./JSONSchema";

export interface RequestCreator {
	importPath: string;
	expose: string;
}

const lowerCamelCase = (id: string) => lowerFirst(camelCase(id));

const getRespBodySchema = (responses: any) => {
	let bodySchema = { type: "null" };

	for (const codeOrDefault in responses) {
		const resp = responses[codeOrDefault];

		const code = Number(codeOrDefault);

		if (code >= 200 && code < 300 && resp.content) {
			const mediaType = first(values(resp.content));
			if (mediaType && mediaType.schema) {
				bodySchema = mediaType.schema;
				break;
			}
		}
	}

	return bodySchema;
};

const getRequestTypes = (f: Genfile, method: string, path: string, op: any) => {
	const requestObject = {
		method: method.toUpperCase(),
		url: path,
	};

	const requestParameters = {};
	const requestUsed = {};

	let emptyType = true;
	let hasParamInPath = false;

	if (op.parameters) {
		for (const p of op.parameters) {
			if (p.in === "header" && p.name === "Authorization") {
				continue;
			}

			if (p.in === "cookie") {
				continue;
			}

			emptyType = false;

			if (p.in === "path") {
				hasParamInPath = true;
				requestObject.url = requestObject.url.replace(
					`{${p.name}}`,
					`\${${p.in}_${lowerCamelCase(p.name)}}`,
				);
			}

			if (p.in === "header") {
				set(
					requestObject,
					["headers", p.name],
					Genfile.id(`${p.in}_${lowerCamelCase(p.name)}`),
				);
			}

			if (p.in === "query") {
				set(
					requestObject,
					["params", p.name],
					Genfile.id(`${p.in}_${lowerCamelCase(p.name)}`),
				);
			}

			set(requestUsed, p.name, Genfile.id(`${p.in}_${lowerCamelCase(p.name)}`));

			if (p.required) {
				set(requestParameters, p.name, typeFromJSONSchema(f, p.schema));
			} else {
				set(requestParameters, `?${p.name}`, typeFromJSONSchema(f, p.schema));
			}
		}
	}

	const anyOfBody = [];

	if (op.requestBody) {
		const contentTypes = keys(op.requestBody.content);

		for (const ct of contentTypes) {
			emptyType = false;

			let schema = op.requestBody.content[ct].schema;

			if (ct === "application/octet-stream") {
				schema = { type: "string", format: "binary" };
			}

			set(requestObject, "body", Genfile.id("body"));
			set(requestUsed, "body", Genfile.id("body"));

			if (contentTypes.length === 1) {
				if (!get(requestObject, ["headers", "Content-Type"])) {
					set(requestObject, ["headers", "Content-Type"], ct);
				}
				set(requestParameters, "body", typeFromJSONSchema(f, schema));
				continue;
			}

			set(
				requestUsed,
				"Content-Type",
				Genfile.id(`${lowerCamelCase("Content-Type")}`),
			);
			set(
				requestObject,
				["headers", "Content-Type"],
				Genfile.id(`${lowerCamelCase("Content-Type")}`),
			);

			anyOfBody.push({
				"Content-Type": ct,
				body: typeFromJSONSchema(f, schema),
			});
		}
	}

	if (hasParamInPath) {
		requestObject.url = Genfile.id(`\`${requestObject.url}\``) as any;
	}

	return {
		requestObject,
		requestType: emptyType ? "void" : intersectionOf(
			...[
				dumpObj(requestParameters),
				...(anyOfBody.length ? [unionOf(...anyOfBody.map((v) => dumpObj(v)))] : []),
			],
		),
		responseType: typeFromJSONSchema(f, getRespBodySchema(op.responses)),
		requestUsed,
		emptyType,
	};
};

export const genClientFromOpenAPI = (
	id: string,
	openapi: any,
	requestCreator: RequestCreator,
): Genfile => {
	const f = Genfile.create(openapi);

	f.import(requestCreator.importPath, requestCreator.expose, "");

	for (const path in openapi.paths) {
		const ops = openapi.paths[path];
		for (const method in ops) {
			const op = ops[method];

			if (op.operationId === "") {
				continue;
			}

			if (op.operationId === "OpenAPI") {
				continue;
			}

			const {
				requestType,
				responseType,
				emptyType,
				requestObject,
				requestUsed,
			} = getRequestTypes(f, method, path, op);

			f.const(
				lowerCamelCase(op.operationId),
				`
/*#__PURE__*/${requestCreator.expose}<${requestType}, ${responseType}>(
    "${id}.${op.operationId}",
    (${emptyType ? "" : dumpObj(requestUsed)}) => (${dumpObj(requestObject)}),
) 
`,
			);
		}
	}

	return f;
};
