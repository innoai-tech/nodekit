import {
	isArray,
	isNull,
	isObject,
	isString,
	isUndefined,
	keys,
	some,
	includes,
	isNumber,
} from "@innoai-tech/lodash";
import type { Schema } from "./Schema";
import {
	create,
	Expression,
	ExpressionBuildFunc,
	register,
} from "./Expression";

export type Context = {
	readonly path?: string;
	readonly schema?: Schema;
	// used for `at` to get direct
	readonly root?: any;
	readonly rootSchema?: Schema;
};

export const validateForSchema = (schema: Schema) => {
	return (value: any): { [k: string]: string } => {
		const errors = {} as { [k: string]: string };

		const walkAndValidate = (ctx: Context) => (value: any) => {
			if (ctx.schema?.type === "array") {
				if (isArray(value)) {
					for (let i = 0; i < value.length; i++) {
						walkAndValidate({
							...ctx,
							schema: ctx.schema.items,
							path: ctx.path ? `${ctx.path}[${i}]` : `[${i}]`,
						})((value as any)[i]);
					}
				}
			}

			if (ctx.schema?.type === "object") {
				if (isObject(value)) {
					for (const [prop, subSchema] of Object.entries(
						ctx.schema.properties,
					)) {
						walkAndValidate({
							...ctx,
							schema: subSchema,
							path: ctx.path ? `${ctx.path}.${prop}` : prop,
						})((value as any)[prop]);
					}
				}
			}

			if (ctx.schema?.need) {
				const validate = create(ctx.schema?.need)(ctx);

				const needRequired = !!validate.args.find(
					(fn) => fn.type === "required",
				);

				const exists = create(required())(ctx);

				if (exists(value)) {
					if (!validate(value)) {
						errors[ctx.path || ""] = (validate as any).errMsg || "";
					}
				} else if (needRequired) {
					errors[ctx.path || ""] = (exists as any).errMsg || "";
				}
			}
		};

		walkAndValidate({
			path: "",
			root: value,
			rootSchema: schema,
			schema: schema,
		})(value);

		return errors;
	};
};

export const need = <T extends any = any>(expr: Expression<any>) => {
	const fn = create(expr);

	return (ctx = {}) => {
		const validate = fn(ctx);

		return (value: T) => {
			if (validate(value)) {
				return "";
			}
			return (validate as any).errMsg || "";
		};
	};
};

export const required = register("required", () => {
	return (_) => {
		const fn = (v: any) => {
			if (isUndefined(v) || isNull(v)) {
				return false;
			}
			if (isString(v) && v === "") {
				return false;
			}
			if (isNumber(v) && isNaN(v as any)) {
				return false;
			}
			return !!v;
		};

		fn.errMsg = "务必填写";
		return fn;
	};
});

export const oneOf = register("oneOf", (
	...valuesOrBuildExprFns: Array<any | ExpressionBuildFunc<any, boolean>>
) => {
	let asEnum = some(valuesOrBuildExprFns, (v) => isString(v));

	if (asEnum) {
		const values = valuesOrBuildExprFns;

		return (_) => {
			const fn = (value: any) => includes(values, value);
			fn.errMsg =
				values.length > 1 ? `值需要是 ${values.join(",")} 之一` : `值需要是 ${values[0]}`;
			return fn;
		};
	}

	const buildExprFns = valuesOrBuildExprFns as ExpressionBuildFunc<
		any,
		boolean
	>[];

	return (ctx) => {
		const fns = buildExprFns.map((buildExprFn) => buildExprFn(ctx)).filter(
			(fn) => !!fn,
		);

		const fn = (value: any) => {
			for (const fn of fns) {
				if (fn!(value)) {
					return true;
				}
			}
			return false;
		};

		fn.args = fns;
		fn.errMsg = fns
			.filter((fn: any) => fn.type !== "required" && !!fn.errMsg)
			.map((fn: any) => fn.errMsg)
			.join(", 或");

		return fn;
	};
});

export const matches = register("matches", (pattern: RegExp) => {
	return (_) => {
		const fn = (v: string) => pattern.test(v);
		fn.errMsg = `务必匹配 ${pattern}`;
		return fn;
	};
});

export const min = register("min", (min: number) => {
	return (ctx: Context) => {
		if (ctx.schema?.type === "string") {
			const fn = (v: any) => v.length >= min;
			fn.errMsg = `至少需要 ${min} 个字符`;
			return fn;
		}

		const fn = (v: any) => v >= min;
		fn.errMsg = `不得小于 ${min}`;
		return fn;
	};
});

export const max = register("max", (min: number) => {
	return (ctx: Context) => {
		if (ctx.schema?.type === "string") {
			// TODO switch to char count
			const fn = (v: any) => v.length <= min;
			fn.errMsg = `不得超过 ${min} 个字符`;
			return fn;
		}

		const fn = (v: any) => v <= min;
		fn.errMsg = `不得大于 ${min}`;
		return fn;
	};
});

export const oneOfEnum = <T extends any>(e: T) => oneOf(...keys(e));
