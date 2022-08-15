import { AppConfig, api, AppContext } from "../../../index";

export const CONFIG: AppConfig = {
	name: "test",
	group: "test",
	manifest: {
		crossorigin: "use-credentials",
	},

	config: {
		APPS: ({ env }) => {
			if (env === "$") {
				return "${{ keys.demo.demo.apps }}";
			}
			return "";
		},

		API_X: api({
			openapi: "/api/test",
		})(({ env, feature }: AppContext) => {
			if (env === "$") {
				return "${{ endpoint.srv-test.apps }}";
			}
			if (env === "local") {
				return "//127.0.0.1:80";
			}
			if (feature === "demo") {
				return "//demo.com";
			}
			return "//demo.querycap.com";
		}),

		API_TEST_X: ({ env, feature }: AppContext) => {
			if (env === "$") {
				return "${{ endpoint.srv-test.apps }}";
			}
			if (env === "local") {
				return "//127.0.0.1:80";
			}
			if (feature === "demo") {
				return "//demo.com";
			}
			return "//demo.querycap.com";
		},
	},
};
