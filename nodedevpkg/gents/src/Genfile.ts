import { writeFile } from "fs/promises";
import {
	isObject,
	isFunction,
	isString,
	map,
	set,
	startsWith,
} from "@innoai-tech/lodash";
import { spawnSync } from "child_process";

export class ID {
	constructor(private id: string) {}

	toString(): string {
		return this.id;
	}
}

export const dumpValue = (v: any) => {
	if (!v) {
		return null;
	}
	if (isFunction(v)) {
		v = v();
	}
	if (v instanceof ID) {
		return `${v}`;
	}
	if (isObject(v)) {
		return `${dumpObj(v)}`;
	}
	if (isString(v)) {
		return `"${v}"`;
	}
	return `${v}`;
};

export const dumpObj = (obj: { [k: string]: any }): string => {
	return `{
${map(obj, (v, k) => {
		if (!v) {
			return null;
		}

		let key = `"${k}"`;

		switch (k[0]) {
			case "?": {
				key = `"${k.slice(1)}"?`;
				break;
			}
			case "+":
				key = `[${k.slice(1)}]`;
		}

		return `${key}: ${dumpValue(v)},`;
	})
		.filter((v) => !!v)
		.join("\n")}
}`;
};

export class Genfile {
	static id(i: string): ID {
		return new ID(i);
	}

	static create(ctx: any): Genfile {
		return new Genfile(ctx);
	}

	constructor(private _ctx: any) {}

	_imports: { [path: string]: { [name: string]: string } } = {};
	_decls: { [path: string]: { type: string; block: string } } = {};

	ctx() {
		return this._ctx;
	}

	import(path: string, name: string, alias: string) {
		set(this._imports, [path, name], alias);
	}

	declared(name: string) {
		return !!this._decls[name];
	}

	const(name: string, block: string) {
		this._decls[name] = { type: "const", block };
	}

	type(name: string, block: string) {
		if (startsWith(block, "extends ")) {
			return this.interface(name, block);
		}
		if (startsWith(block, "{")) {
			return this.interface(name, block);
		}
		this._decls[name] = { type: "type", block };
	}

	interface(name: string, block: string) {
		this._decls[name] = { type: "interface", block };
	}

	enum(name: string, block: string) {
		this._decls[name] = { type: "enum", block };
	}

	async sync(file: string) {
		await writeFile(
			file,
			Buffer.from(
				[
					...map(this._imports, (nameAndAlias, path) => {
						return `import { ${map(
							nameAndAlias,
							(alias, name) => (alias ? `${name} as ${alias}` : name),
						).join(", ")} } from "${path}";`;
					}),
					...map(this._decls, ({ block, type }, name) => {
						if (type === "interface" || type === "enum") {
							return `export ${type} ${name} ${block}`;
						}
						return `export ${type} ${name} = ${block}`;
					}),
				].join("\n\n"),
			),
		);

		try {
			spawnSync("prettier", [file, "-w"]);
		} catch (_) {}
		return;
	}
}
