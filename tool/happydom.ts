import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { JSDOM } from "jsdom";

const dom = new JSDOM(``);

// https://github.com/oven-sh/bun/issues/6044#issuecomment-1743414281
const global = {
  console: console,
  Blob: Blob,
  Response: Response,
  fetch: fetch,
  XMLHttpRequest: dom.window.XMLHttpRequest
};

console.log("happy-dom registering...");

GlobalRegistrator.register();

Object.assign(window, global);
