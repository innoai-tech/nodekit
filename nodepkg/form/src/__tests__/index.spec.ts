import {describe, test, expect} from "vitest";
import {
    allOf,
    objectOf,
    string,
    number,
    boolean,
    required,
    FormSubject,
    oneOf,
    when,
    pipe,
    get,
    select,
    gte, charCount,
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
                            allOf(
                                pipe(get("lastName"), oneOf("xxx")),
                                pipe(get("age"), gte(10)),
                            ),
                            pipe(charCount(), gte(10)),
                        ),
                        pipe(charCount(), gte(4)),
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
            "allOf(required(),pipe(charCount(),gte(4)))",
        );
        expect(fieldFirstName$.value.error).toBe("务必填写");
    });

    test("submit firstName with 'test', will throw length error", () => {
        fieldFirstName$.next("tes");
        form$.submit();

        expect(fieldFirstName$.validate?.toString()).toBe(
            "allOf(required(),pipe(charCount(),gte(4)))",
        );
        expect(fieldFirstName$.value.error).toBe("字符数不得小于 4");
    });

    test("when lastName with 'xxx', submit firstName with 'test', will throw length error", () => {
        fieldFirstName$.next("test");
        fieldLastname$.next("xxx");
        fieldAge$.next(18);

        form$.submit();

        expect(fieldFirstName$.validate?.toString()).toBe(
            "allOf(required(),pipe(charCount(),gte(10)))",
        );
        expect(fieldFirstName$.value.error).toBe("字符数不得小于 10");
    });
});

