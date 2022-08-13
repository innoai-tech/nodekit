import { describe, it } from "vitest";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { generateClient } from "..";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("#generateClient", () => {
  it("gen", async () => {
    await generateClient({
      id: "ExampleClient",
      uri: `files://${join(__dirname, "example/openapi.json")}`,
      outDir: __dirname,
      requestCreator: {
        expose: "createRequest",
        importPath: "./client",
      },
      force: true,
    });
  });
});