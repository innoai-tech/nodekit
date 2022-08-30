import {describe, test, expect} from "vitest";
import Ajv from "ajv"
import {
    FormSubject,
    object,
    string,
    describe as desc,
    when,
    dumpJSONSchema,
    at,
    need,
    min,
    required,
    number,
    oneOf,
    allOf,
} from "..";

describe("Validation", () => {
    test("allOf", () => {
        const validate = allOf(
            at("lastName", oneOf("xxx")),
            at("age", min(10)),
        )

        const valid = validate("xx", {age: 18, lastName: "xxx"})
        expect(valid).toBe(true);
    })
})

describe("FormSubject", () => {
    const form$ = FormSubject.of(object({
            firstName: string(
                desc("FirstName"),
                need(required(), min(20)),
                when(allOf(
                    at("lastName", oneOf("xxx")),
                    at("age", min(10)),
                ), {
                    then: need(min(10)),
                }),
            ),
            lastName: string(
                desc("LastName"),
            ),
            age: number(
                desc("Age"),
            ),
        },
    ));

    const fieldFirstName$ = form$.register("firstName");
    const fieldLastname$ = form$.register("lastName");
    const fieldAge$ = form$.register("age");

    test("submit without value, will throw required error", () => {
        form$.submit();
        expect(fieldFirstName$.value.error).toBe("务必填写");
    });

    test("submit firstName with 'test', will throw length error", () => {
        fieldFirstName$.next("test");
        form$.submit();

        expect(fieldFirstName$.value.error).toBe("字符长度务必大于 20");
    });

    test("when lastName with 'xxx', submit firstName with 'test', will throw length error", () => {
        fieldFirstName$.next("test");
        fieldLastname$.next("xxx");
        fieldAge$.next(18);

        form$.submit();

        expect(fieldFirstName$.value.error).toBe("字符长度务必大于 10");
    });

    test("dump json schema", () => {
        const schema = {
            type: "object",
            properties: {
                firstName: {
                    type: "string",
                    minLength: 20,
                },
                lastName: {
                    type: "string"
                },
                age: {
                    type: "number"
                },
            },
            required: [
                "firstName"
            ],
            allOf: [{
                if: {
                    allOf: [
                        {
                            required: ["lastName"],
                            properties: {
                                lastName: {
                                    type: "string",
                                    enum: ["xxx"]
                                },
                            }
                        },
                        {
                            required: ["age"],
                            properties: {
                                age: {
                                    type: "number",
                                    minimum: 10
                                },
                            }
                        }
                    ]
                },
                then: {
                    properties: {
                        firstName: {
                            type: "string",
                            minLength: 10,
                        }
                    }
                },
            }]
        }

        const ajv = new Ajv()


        const validate = ajv.compile(schema)
        validate({
            firstName: "test",
            age: 18,
        })
        expect(validate.errors![0]!.params).toEqual({
            limit: 20
        })

        validate({
            firstName: "test",
            age: 18,
            lastName: "xxx",
        })

        expect(validate.errors![0]!.params).toEqual({
            limit: 10
        })

        expect(dumpJSONSchema(form$.schema)).toEqual(schema)
    })
});
