import { test } from "vitest";
import { transform } from "@swc/core";

test("#swc test", async () => {
	const ret = await transform(
		`
export const AcXXX = () => {
   const put$ = useRequest(putApp)
   return null
}
    `,
		{
			swcrc: false,
			jsc: {
				parser: {
					syntax: "typescript",
					tsx: true,
					dynamicImport: true,
				},
				target: "es2022",
				transform: {
					react: {
						runtime: "automatic",
					},
				},
				externalHelpers: false,
				experimental: {
					plugins: [["@innoai-tech/swc-plugin-access-control-autocomplete", {}]],
				},
			},
		},
	);

	console.log(ret.code);
});
