import {describe, test, expect} from "vitest";
import {
    min,
    max,
    allOf,
    need,
    object,
    string,
    number,
    boolean,
    required,
    FormSubject,
    validateForSchema
} from "..";

describe("Validation", () => {
    test("min", () => {
        const validate = need<number>(min(10), {type: "number"})
        expect(validate(15)).toBe("");
    })

    test("allOf", () => {
        const validate = need(allOf(min(10), max(20)), {type: "number"})
        expect(validate(15)).toBe("");
        expect(validate(21)).toBe("不得小于 10, 且不得大于 20");
        expect(validate(9)).toBe("不得小于 10, 且不得大于 20");
    })

    test("validate schema", () => {
        const schema = object({
            firstName: string().need(required(), min(4)),
            lastName: string().need(min(4)),
        })()

        const validate = validateForSchema(schema);

        expect(validate({})).toEqual({
            "firstName": "务必填写",
        })

        expect(validate({
            "firstName": "123"
        })).toEqual({
            "firstName": "至少需要 4 个字符",
        })

        expect(validate({
            "firstName": "123",
            "lastName": "123"
        })).toEqual({
            "firstName": "至少需要 4 个字符",
            "lastName": "至少需要 4 个字符",
        })
    })
})

describe("FormSubject", () => {
    type S = {
        firstName: string,
        lastName: string,
        age: number,
        accept: boolean,
    }

    // console.log(JSON.stringify(schema, null, 2))

    // .should(required(), min(20))
    // .should(required(), min(10), when(
    //     allOf(
    //         check("lastName", oneOf("xxx")),
    //         at("age", min(10)),
    //     )),
    // ),

    const form$ = FormSubject.of(object<S>({
        firstName: string().label("First name").need(required(), min(4)),
        lastName: string().label("Last name").desc("Family name"),
        age: number().label("Age"),
        accept: boolean().label("Accept")
    })());

    const fieldFirstName$ = form$.register("firstName");
    // const fieldLastname$ = form$.register("lastName");
    // const fieldAge$ = form$.register("age");

    test("submit without value, will throw required error", () => {
        form$.submit();
        expect(fieldFirstName$.value.error).toBe("务必填写");
    });

    test("submit firstName with 'test', will throw length error", () => {
        fieldFirstName$.next("tes");
        form$.submit();

        expect(fieldFirstName$.value.error).toBe("至少需要 4 个字符");
    });

    // test("when lastName with 'xxx', submit firstName with 'test', will throw length error", () => {
    //     fieldFirstName$.next("test");
    //     fieldLastname$.next("xxx");
    //     fieldAge$.next(18);
    //
    //     form$.submit();
    //
    //     expect(fieldFirstName$.value.error).toBe("字符长度务必大于 10");
    // });
});
