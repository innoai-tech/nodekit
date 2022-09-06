import {describe, test, expect} from "vitest";
import {
    min,
    max,
    allOf,
    need,
    objectOf,
    string,
    number,
    boolean,
    required,
    FormSubject,
    validateForSchema,
    oneOf,
    when,
    at,
    arrayOf,
    matches,
} from "..";

describe("Validation", () => {
    test("min", () => {
        const validate = need<number>(min(10));
        expect(validate(15, {schema: {type: "number"}})).toBe("");
    });

    test("allOf", () => {
        const validate = need(allOf(min(10), max(20)));
        expect(validate(15, {schema: {type: "number"}})).toBe("");
        expect(validate(21, {schema: {type: "number"}})).toBe(
            "不得小于 10, 且不得大于 20",
        );
        expect(validate(9, {schema: {type: "number"}})).toBe(
            "不得小于 10, 且不得大于 20",
        );
    });

    const schema = objectOf({
        firstName: string().need(required(), min(4)),
        age: number(),
        lastName: string().need(when(allOf(
            at("firstName", oneOf("xxxx")),
            at("age", min(18))
        ), min(9), min(4))),
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
                firstName: "123",
            }),
        ).toEqual({
            firstName: "至少需要 4 个字符",
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
                firstName: "xxxx",
            }),
        ).toEqual({
            lastName: "至少需要 9 个字符",
        });
    });
});

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
                    when(
                        allOf(at("lastName", oneOf("xxx")), at("age", min(10))),
                        min(10),
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
        expect(fieldFirstName$.value.error).toBe("务必填写");
    });

    test("submit firstName with 'test', will throw length error", () => {
        fieldFirstName$.next("tes");
        form$.submit();

        expect(fieldFirstName$.value.error).toBe("至少需要 4 个字符");
    });

    test("when lastName with 'xxx', submit firstName with 'test', will throw length error", () => {
        fieldFirstName$.next("test");
        fieldLastname$.next("xxx");
        fieldAge$.next(18);

        form$.submit();
        expect(fieldFirstName$.value.error).toBe("至少需要 10 个字符");
    });
});
