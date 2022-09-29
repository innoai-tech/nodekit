import {describe, test, expect} from "vitest";
import {charCount, E} from "..";
import {
    create,
    keyPathToSchemaKeyPath,
} from "../Expression";

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
        E.select(
            E.when(
                E.anyOf(
                    E.pipe(E.get("age"), E.gte(18)),
                    E.pipe(E.get("firstName"), E.oneOf("xxx")),
                ),
                E.pipe(charCount(), E.gte(9)),
            ),
            E.pipe(charCount(), E.gte(4)),
        ),
    );

    test("When default", () => {
        const validate = fn({});
        expect(validate("1234")).toBe(true);
        expect(`${validate}`).toBe("pipe(charCount(),gte(4))");
    });

    test("When with age is 18", () => {
        const validate = fn({root: {age: 18}});
        expect(`${validate}`).toBe("pipe(charCount(),gte(9))");
        expect(validate("1234")).toBe(false);
        expect(fn({root: {firstName: "xxx"}})(4)).toBe(false);
    });

    test("When with firstName is xxx", () => {
        const validate = fn({root: {firstName: "xxx"}});
        expect(`${validate}`).toBe("pipe(charCount(),gte(9))");
        expect(validate("1234")).toBe(false);
    });
});
