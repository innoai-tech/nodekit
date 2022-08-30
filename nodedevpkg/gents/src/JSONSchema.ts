import { dumpObj, dumpValue, Genfile } from "./Genfile";

import {
	last,
	assign,
	filter,
	times,
	has,
	indexOf,
	isArray,
	isBoolean,
	isObject,
	map,
	get,
	some,
	values,
	take,
} from "@innoai-tech/lodash";

const isObjectType = (schema: any): boolean => schema.type === "object";
const isArrayType = (schema: any): boolean => schema.type === "array";
const isNumberType = (schema: any): boolean =>
	schema.type === "number" || schema.type === "integer";
const isStringType = (schema: any): boolean => schema.type === "string";
const isNullType = (schema: any): boolean => schema.type === "null";
const isBooleanType = (schema: any): boolean => schema.type === "boolean";

const typeRelationKeywords: { [k: string]: string[] } = {
	object: [
		"properties",
		"additionalProperties",
		"unevaluatedProperties",
		"patternProperties",
		"propertyNames",
		"dependentSchemas",

		"maxProperties",
		"minProperties",
		// "required",
		// "dependentRequired",
	],
	array: [
		"contains",
		"items",
		"additionalItems",
		"unevaluatedItems",

		"maxItems",
		"minItems",
		"uniqueItems",
		"maxContains",
		"minContains",
	],
	string: [
		"pattern",
		"contentMediaType",
		"contentEncoding",
		"contentSchema",
		"maxLength",
		"minLength",
	],
	number: [
		"maximum",
		"minimum",
		"multipleOf",
		"exclusiveMaximum",
		"exclusiveMinimum",
	],
};

const hasProps = <T>(schema: T, props: Array<keyof T>): boolean =>
	some(props, (prop: string) => has(schema, prop));

export const isMetaType = (schema: any): any => {
	return !hasProps(schema, ["type", "$ref", "$id", "oneOf", "anyOf", "allOf"]);
};

export const normalizeSchema = (schema: any): any => {
	if (isBoolean(schema)) {
		return {};
	}

	// auto complete schema type
	if (!schema.type) {
		for (const t in typeRelationKeywords) {
			if (hasProps(schema, typeRelationKeywords[t] as any)) {
				schema.type = t as any;
				break;
			}
		}
	}

	if (schema.const) {
		schema.enum = [schema.const];
	}

	const mayNormalizeMeta = (key: "allOf" | "anyOf" | "oneOf") => {
		if (schema[key]) {
			schema[key] = filter(schema[key], (s) => {
				const ns = normalizeSchema(s);
				if (isMetaType(ns)) {
					if (key === "allOf") {
						// only allOf will merge meta
						assign(schema, ns);
					}
					return false;
				}
				return true;
			});

			if (schema[key]!.length === 0) {
				schema[key] = undefined;
			}
		}
	};

	mayNormalizeMeta("allOf");
	mayNormalizeMeta("anyOf");
	mayNormalizeMeta("oneOf");

	return schema;
};

export const intersectionOf = (...values: any[]) => {
	return Genfile.id(
		values
			.filter((v) => `${v}` !== "any")
			.map((v) => `(${v})`)
			.join(" & "),
	);
};

export const unionOf = (...values: any[]) => {
	return Genfile.id(values.map((v) => `(${v})`).join(" | "));
};

const typeFromObjectJSONSchema = (f: Genfile, schema: any): any => {
	const obj: { [k: string]: any } = {};

	if (schema.properties) {
		for (let prop in schema.properties) {
			const propSchema = schema.properties[prop];
			if (indexOf(schema.required || [], prop) === -1) {
				prop = `?${prop}`;
			}
			obj[prop] = typeFromJSONSchema(f, propSchema);
		}
	}

	if (schema.additionalProperties) {
		const keyType = typeFromJSONSchema(
			f,
			schema.propertyNames || { type: "string" },
		);

		if (typeof schema.additionalProperties === "boolean") {
			obj[`+k: ${keyType}`] = Genfile.id("any");
		} else {
			obj[`+k: ${keyType}`] = typeFromJSONSchema(f, schema.additionalProperties);
		}
	}

	if (schema.patternProperties) {
		obj["+k:string"] = unionOf(
			...map(values(schema.patternProperties), (s) => typeFromJSONSchema(f, s)),
		);
	}

	return Genfile.id(dumpObj(obj));
};

const typeFromArrayJSONSchema = (f: Genfile, schema: any): any => {
	if (isArray(schema.items)) {
		if (isObject(schema.additionalItems)) {
			return Genfile.id(
				`[${map(
					schema.items,
					(itemSchema) => typeFromJSONSchema(f, itemSchema),
				).join(", ")}]`,
			);
		}

		return Genfile.id(
			`[${map(
				schema.items,
				(itemSchema) => typeFromJSONSchema(f, itemSchema),
			).join(", ")}]`,
		);
	}

	if (schema.maxItems && schema.maxItems === schema.minItems) {
		return Genfile.id(
			`[${map(
				times(schema.maxItems),
				() => typeFromJSONSchema(f, schema.items),
			).join(", ")}]`,
		);
	}

	return Genfile.id(`Array<${typeFromJSONSchema(f, schema.items)}>`);
};

const refID = (f: Genfile, ref: string) => {
	const parts = last(ref.split("#/"))!.split("/");
	const name = last(parts)!;
	const schema = get(f.ctx(), parts, {});

	if (schema.enum) {
		if (!f.declared(name)) {
			f.enum(name, `${typeFromJSONSchema(f, schema)}`);
		}

		return Genfile.id(`keyof typeof ${name}`);
	}

	if (!f.declared(name)) {
		f.type(name, `${typeFromJSONSchema(f, schema)}`);
	}

	return Genfile.id(name);
};

export const typeFromJSONSchema = (f: Genfile, schema: any): any => {
	schema = normalizeSchema(schema);

	if (schema.$ref) {
		return refID(f, schema.$ref);
	}

	if (schema.enum) {
		return `{
${map(schema.enum, (v) => `${dumpValue(Genfile.id(v))} = ${dumpValue(v)}`).join(
			",\n",
		)}        
}`;
	}

	if (schema.anyOf) {
		return unionOf(...map(schema.anyOf, (s) => typeFromJSONSchema(f, s)));
	}

	if (schema.allOf) {
		let extendableAllOf = true;

		for (let i = 0; i < schema.allOf.length; i++) {
			const s = schema.allOf[i];

			if (schema.allOf.length - 1 === i) {
				if (s.$ref) {
					extendableAllOf = false;
					break;
				}

				if (!isObjectType(s)) {
					extendableAllOf = false;
				}
				break;
			}

			if (s && !s.$ref) {
				extendableAllOf = false;
				break;
			}
		}

		if (extendableAllOf) {
			return Genfile.id(
				`extends ${map(take(schema.allOf, schema.allOf.length - 1), (
					s: any,
				) => {
					return `${refID(f, s.$ref)}`;
				}).join(", ")} ${typeFromJSONSchema(
					f,
					schema.allOf[schema.allOf.length - 1],
				)}`,
			);
		}

		return intersectionOf(
			...map(schema.allOf, (s) => typeFromJSONSchema(f, s)),
		);
	}

	if (isObjectType(schema)) {
		return typeFromObjectJSONSchema(f, schema);
	}

	if (isArrayType(schema)) {
		return typeFromArrayJSONSchema(f, schema);
	}

	if (isStringType(schema)) {
		if (schema.format === "binary") {
			return Genfile.id("File | Blob");
		}
		return Genfile.id("string");
	}

	if (isNumberType(schema)) {
		return Genfile.id("number");
	}

	if (isBooleanType(schema)) {
		return Genfile.id("boolean");
	}

	if (isNullType(schema)) {
		return Genfile.id("null");
	}

	return Genfile.id("any");
};
