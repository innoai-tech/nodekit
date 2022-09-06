import { describe, test, expect } from "vitest";
import {
	at,
	create,
	keyPathToSchemaKeyPath,
	select,
	when,
} from "../Expression";
import { min, oneOf } from "../Validation";

test("keyPathToSchemaKeyPath", () => {
	expect(keyPathToSchemaKeyPath("a.b.c")).toBe(
		"rootSchema.properties.a.properties.b.properties.c",
	);
	expect(keyPathToSchemaKeyPath("a[0].c")).toBe(
		"rootSchema.properties.a.items.properties.c",
	);
	expect(keyPathToSchemaKeyPath("a[1000].c")).toBe(
		"rootSchema.properties.a.items.properties.c",
	);
});

describe("Expression", () => {
	const fn = create(
		select(
			when(oneOf(at("age", min(18)), at("firstName", oneOf("xxx"))), min(9)),
			min(4),
		),
	);

	test("When default", () => {
		const validate = fn({});
		expect(validate(4)).toBe(true);
		expect(`${validate}`).toBe("min(4)");
	});

	test("When with age is 18", () => {
		const validate = fn({ root: { age: 18 } });
		expect(`${validate}`).toBe("min(9)");
		expect(validate(4)).toBe(false);
		expect(fn({ root: { firstName: "xxx" } })(4)).toBe(false);
	});

	test("When with firstName is xxx", () => {
		const validate = fn({ root: { firstName: "xxx" } });
		expect(`${validate}`).toBe("min(9)");
		expect(validate(4)).toBe(false);
	});
});
