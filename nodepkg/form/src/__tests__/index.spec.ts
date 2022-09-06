import { describe, test, expect } from "vitest";
import {
	min,
	allOf,
	objectOf,
	string,
	number,
	boolean,
	required,
	FormSubject,
	oneOf,
	when,
	at,
	select,
} from "..";

describe("FormSubject", () => {
	type S = {
		firstName: string;
		lastName: string;
		age: number;
		accept: boolean;
	};

	const form$ = FormSubject.of(
		objectOf<S>({
			firstName: string()
				.label("First name")
				.need(
					required(),
					select(
						when(
							allOf(at("lastName", oneOf("xxx")), at("age", min(10))),
							min(10),
						),
						min(4),
					),
				),
			lastName: string().label("Last name").desc("Family name"),
			age: number().label("Age"),
			accept: boolean().label("Accept"),
		})(),
	);

	const fieldFirstName$ = form$.register("firstName");
	const fieldLastname$ = form$.register("lastName");
	const fieldAge$ = form$.register("age");

	test("submit without value, will throw required error", () => {
		form$.submit();
		expect(fieldFirstName$.validate?.toString()).toBe(
			"allOf(required(),min(4))",
		);
		expect(fieldFirstName$.value.error).toBe("务必填写");
	});

	test("submit firstName with 'test', will throw length error", () => {
		fieldFirstName$.next("tes");
		form$.submit();

		expect(fieldFirstName$.validate?.toString()).toBe(
			"allOf(required(),min(4))",
		);
		expect(fieldFirstName$.value.error).toBe("至少需要 4 个字符");
	});

	test("when lastName with 'xxx', submit firstName with 'test', will throw length error", () => {
		fieldFirstName$.next("test");
		fieldLastname$.next("xxx");
		fieldAge$.next(18);

		form$.submit();

		expect(fieldFirstName$.validate?.toString()).toBe(
			"allOf(required(),min(10))",
		);
		expect(fieldFirstName$.value.error).toBe("至少需要 10 个字符");
	});
});
