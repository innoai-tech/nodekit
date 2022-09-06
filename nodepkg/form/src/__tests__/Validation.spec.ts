import { describe, test, expect } from "vitest";
import {
	matches,
	max,
	min,
	need,
	oneOf,
	required,
	validateForSchema,
} from "../Validation";
import { arrayOf, number, objectOf, string } from "../Schema";
import { allOf, at, select, when } from "../Expression";

describe("Validation", () => {
	test("min", () => {
		const validate = need<number>(min(10))({ schema: number() });
		expect(validate(15)).toBe("");
	});

	test("allOf", () => {
		const validate = need(allOf(min(10), max(20)))({ schema: number() });

		expect(validate(15)).toBe("");
		expect(validate(21)).toBe("不得小于 10, 且不得大于 20");
		expect(validate(9)).toBe("不得小于 10, 且不得大于 20");
	});

	const schema = objectOf({
		firstName: string().need(required(), min(3)),
		lastName: string().need(
			select(
				when(allOf(at("firstName", oneOf("xxx")), at("age", min(18))), min(9)),
				min(4),
			),
		),
		age: number(),
		phones: arrayOf(string().need(matches(/[0-9]{11}/))),
	})();

	const validate = validateForSchema(schema);

	test("validate value when empty", () => {
		expect(validate({})).toEqual({
			firstName: "务必填写",
		});
	});

	test("validate value in array", () => {
		expect(
			validate({
				firstName: "1234",
				phones: ["123", "13100000000"],
			}),
		).toEqual({
			"phones[0]": "务必匹配 /[0-9]{11}/",
		});
	});

	test("validate value when char not enough", () => {
		expect(
			validate({
				firstName: "12",
			}),
		).toEqual({
			firstName: "至少需要 3 个字符",
		});
	});

	test("validate value when condition", () => {
		expect(
			validate({
				firstName: "1234",
				lastName: "123",
			}),
		).toEqual({
			lastName: "至少需要 4 个字符",
		});

		expect(
			validate({
				lastName: "123",
				age: 18,
				firstName: "xxx",
			}),
		).toEqual({
			lastName: "至少需要 9 个字符",
		});
	});
});
