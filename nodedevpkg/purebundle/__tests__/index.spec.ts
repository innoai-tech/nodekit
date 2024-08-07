import { describe, expect, it } from "bun:test";
import { transform as swcTransform } from "@swc/core";
import { transform, usePlugin } from "..";

const cases = [
  {
    title: "drop side imports",
    src: `
export { b as bundle, c as chunkCleanup } from "./bundle-f5ef09b5.mjs";
import "@rollup/plugin-node-resolve";
import "fs";
import "@innoai-tech/lodash";
import "path";
import "rollup";
`,
    dest: `
export { b as bundle, c as chunkCleanup } from "./bundle-f5ef09b5.mjs"
`
  },
  {
    title: "Annotated #__PURE__",
    src: `const A = String("a");`,
    dest: `const A = /*#__PURE__*/String("a");`
  },
  {
    title: "Annotated #__PURE__ in assignment expression",
    src: `A = String("a");`,
    dest: `A = /*#__PURE__*/String("a");`
  },
  {
    title: "Annotated #__PURE__ multiline",
    src: `const A = String("a");
const B = String("b");`,
    dest: `const A = /*#__PURE__*/String("a");
const B = /*#__PURE__*/String("b");`
  },
  {
    title: "Skip #__PURE__ for side effect fn()",
    src: "fn();",
    dest: "fn();"
  },
  {
    title: "Skip #__PURE__ for side effect fn()()()",
    src: "fn()()();",
    dest: "fn()()();"
  },
  {
    title: "Skip annotated #__PURE__ when with variable used in param callback",
    src: "const a = s$.pipe().subscribe(() => { a.subscribe() }, 1000)",
    dest: "const a = s$.pipe().subscribe(() => { a.subscribe() }, 1000)"
  },
  {
    title: "Skip annotated #__PURE__ when with variable used in param callback",
    src: "const a = setInterval(() => { console.log(a) }, 1000)",
    dest: "const a = setInterval(() => { console.log(a) }, 1000)"
  },
  {
    title: "Annotated #__PURE__ when with variable not used in param callback",
    src: "const a = /*#__PURE__*/setInterval(() => { }, 1000)",
    dest: "const a = /*#__PURE__*/setInterval(() => { }, 1000)"
  },
  {
    title: "Annotated #__PURE__ when with variable not used in param callback",
    src: "const b = 1; const a = /*#__PURE__*/setInterval(() => { console.log(b) }, 1000)",
    dest: "const b = 1; const a = /*#__PURE__*/setInterval(() => { console.log(b) }, 1000)"
  },
  {
    title:
      "Annotated #__PURE__ when with variable used in param callback in assignment expression",
    src: "let a; a = /*#__PURE__*/setInterval(() => { console.log(a) }, 1000)",
    dest: "let a; a = /*#__PURE__*/setInterval(() => { console.log(a) }, 1000)"
  },
  {
    title: "Skip annotated #__PURE__ when already have",
    src: `const A = /*#__PURE__*/String("a");`,
    dest: `const A = /*#__PURE__*/String("a");`
  },
  {
    title: "Annotated #__PURE__ with other comments",
    src: `const A = /*other comments*/String("a");`,
    dest: `const A = /*other comments*/ /*#__PURE__*/String("a");`
  },
  {
    title: "Annotated #__PURE__ when export",
    src: `export const A = String("a");`,
    dest: `export const A = /*#__PURE__*/String("a");`
  },
  {
    title: "Annotated #__PURE__ for IIFE",
    src: `export const A = (() => "a")();`,
    dest: `export const A = /*#__PURE__*/(() => "a")();`
  },
  {
    title: "Annotated #__PURE__ for IIFE with function",
    src: `export const A = (function () { return "a" })();`,
    dest: `export const A = /*#__PURE__*/(function () { return "a" })();`
  },
  {
    title: "Annotated #__PURE__ for defined add(0, 1) called in IIFE",
    src: "const add = (x, y) => x + y; export const one = (() => add(0, 1))();",
    dest: "const add = (x, y) => x + y; export const one = /*#__PURE__*/(() => add(0, 1))();"
  },
  {
    title: "Annotated #__PURE__ for IIFE should not deep walk body",
    src: `export const A = (() => call("b"))();`,
    dest: `export const A = /*#__PURE__*/(() => call("b"))();`
  },
  {
    title: "Annotated #__PURE__ for import()",
    src: `export const A = import("")`,
    dest: `export const A = /*#__PURE__*/import("");`
  },
  {
    title: "Annotated #__PURE__ for fn(fn())",
    src: "export const A = fn(fn())",
    dest: "export const A = /*#__PURE__*/fn( /*#__PURE__*/fn());"
  },
  {
    title: "Annotated #__PURE__ for undefined fn(0)",
    src: "export const one = fn(0);",
    dest: "export const one = /*#__PURE__*/fn(0);"
  },
  {
    title: "Annotated #__PURE__ for defined fn(0)",
    src: "const fn = (x) => x; export const one = fn(0);",
    dest: "const fn = (x) => x; export const one = /*#__PURE__*/fn(0);"
  },
  {
    title: "Annotated #__PURE__ for undefined add(0, 1)",
    src: "export const one = add(0, 1);",
    dest: "export const one = /*#__PURE__*/add(0, 1);"
  },
  {
    title: "Annotated #__PURE__ for pure call as parameter",
    src: "export const one = add(0, add(0, 1));",
    dest: "export const one = /*#__PURE__*/add(0, /*#__PURE__*/add(0, 1));"
  },
  {
    title: "Annotated #__PURE__ for pure call as array item",
    src: "([add(0,1)]);",
    dest: "([/*#__PURE__*/add(0,1)]);"
  },
  {
    title: "Annotated #__PURE__ for pure call as object property",
    src: "({ x: add(0,1) })",
    dest: "({ x: /*#__PURE__*/add(0,1) })"
  },
  {
    title: "Annotated #__PURE__ for defined add(0, 1)",
    src: "const add = (x, y) => x + y; export const one = add(0, 1);",
    dest: "const add = (x, y) => x + y; export const one = /*#__PURE__*/add(0, 1);"
  }
];

function unPad(str: string) {
  return str.replace(/^\n+|\n+$/, "").replace(/\n+/g, "\n");
}

describe("test cases", () => {
  for (const caseItem of cases) {
    ((caseItem as any).only ? it.only : it)(caseItem.title, async () => {
      const transformedCode = (
        await transform(caseItem.src, {
          plugins: [usePlugin({})]
        })
      ).code;

      const expectCode = (
        await swcTransform(caseItem.dest, {
          swcrc: false,
          env: {
            targets: "defaults"
          },
          jsc: {
            parser: {
              syntax: "typescript",
              tsx: true,
              dynamicImport: true
            },
            externalHelpers: false
          }
        })
      ).code;

      expect(unPad(transformedCode || "")).toEqual(unPad(expectCode || ""));
    });
  }
});
