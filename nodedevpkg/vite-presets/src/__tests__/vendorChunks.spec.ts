import {describe, expect, it} from "vitest";
import {resolvePkgEntryOwners} from "../vendorChunks";

describe("#foldDeps", () => {
    it("should fold", async () => {
        const folded = resolvePkgEntryOwners([
            "a",
            "b",
        ], {
            "a": [
                "b"
            ],
            "c": [
                "a",
                "b",
            ],
            "d": [
                "c",
                "e"
            ],
            "e": [
                "a"
            ]
        })

        expect(folded).toEqual({
            "a": "",
            "b": "",
            "c": "a",
            "d": "a",
            "e": "a",
        })
    });
});
