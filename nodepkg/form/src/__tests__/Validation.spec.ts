import {describe, test, expect} from "vitest";
import {
    need,
    validateForSchema,
} from "../Validation";
import {arrayOf, number, objectOf, string} from "../Schema";
import {allOf, charCount, get, gte, lte, match, oneOf, pipe, required, select, when} from "..";

describe("Validation", () => {
    test("gte", () => {
        const validate = need<number>(gte(10))({schema: number()});
        expect(validate(15)).toBe("");
    });

    test("allOf", () => {
        const validate = need(allOf(gte(10), lte(20)))({schema: number()});

        expect(validate(15)).toBe("");
        expect(validate(21)).toBe("不得小于 10, 且不得大于 20");
        expect(validate(9)).toBe("不得小于 10, 且不得大于 20");
    });

    const schema = objectOf({
        firstName: string().need(
            required(),
            pipe(charCount(), gte(3)),
        ),
        lastName: string().need(
            select(
                when(
                    allOf(
                        pipe(get("firstName"), oneOf("xxx")),
                        pipe(get("age"), gte(18)),
                    ),
                    pipe(charCount(), gte(9)),
                ),
                pipe(charCount(), gte(4))
            ),
        ),
        age: number(),
        phones: arrayOf(string().need(match(/[0-9]{11}/))),
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

    test("validate value when char count not enough", () => {
        expect(
            validate({
                firstName: "12",
            }),
        ).toEqual({
            firstName: "字符数不得小于 3",
        });
    });

    test("validate value when condition not matched", () => {
        expect(
            validate({
                firstName: "1234",
                lastName: "123",
            }),
        ).toEqual({
            lastName: "字符数不得小于 4",
        });
    });

    test("validate value when condition matched", () => {
        expect(
            validate({
                lastName: "123",
                age: 18,
                firstName: "xxx",
            }),
        ).toEqual({
            lastName: "字符数不得小于 9",
        });
    });
});
