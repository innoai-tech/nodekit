import { describe, expect, it } from "bun:test";
import { parseSearch, stringifySearch } from "../util";

describe("search", () => {
  it("#stringifySearch", () => {
    const c = stringifySearch({
      key1: "111",
      key2: "a111,"
    });
    expect(c).toEqual("?key1=111&key2=a111%2C");
  });

  it("#parseSearch", () => {
    const c = parseSearch("?key1=111&key2=a111%2C");

    expect(c).toEqual({
      key1: ["111"],
      key2: ["a111,"]
    });
  });
});
