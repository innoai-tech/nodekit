import {describe, it} from "vitest"
import {bundle} from "../bundle";
import {dirname, join} from "path";
import {fileURLToPath} from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("monobundle", () => {
    it("bundle", async () => {
        await bundle({
            cwd: join(__dirname, "../../"),
        });
    });
});
