import { describe, it, expect } from "vitest";
import { loadConfig } from "../index";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("loadConfig", () => {
	it("load", async () => {
		const config = await loadConfig(join(__dirname, "./__example__/config.ts"));
		const f = config({ env: "local", feature: "" });

		expect(f.config).toEqual({
			APPS: "",
			API_X: "//127.0.0.1:80",
			API_TEST_X: "//127.0.0.1:80",
		});

		expect(f.metadata).toEqual({
			APPS: {},
			API_X: {
				api: {
					id: "x",
					openapi: "/api/test",
				},
			},
			API_TEST_X: {
				api: {
					id: "test-x",
					openapi: "/api/test-x",
				},
			},
		});

		const f2 = config({ env: "$", feature: "" });

		expect(f2.config).toEqual({
			APPS: "${{ keys.demo.demo.apps }}",
			API_X: "${{ endpoint.srv-test.apps }}",
			API_TEST_X: "${{ endpoint.srv-test.apps }}",
		});
	});
});
