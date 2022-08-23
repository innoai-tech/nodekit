import type { PluginOption } from "vite";
import { ChunksGroups, vendorChunks } from "./vendorChunks";
import { swc, SWCOptions } from "./swc";
import react from "@vitejs/plugin-react";

export const presetReact = ({ chunkGroups, swc: swcOptions }: {
	swc?: SWCOptions;
	chunkGroups?: ChunksGroups;
}): PluginOption[] => {
	return [
		{
			name: "vite-presets/react",
			config(c) {
				c.resolve = c.resolve ?? {};
				c.resolve.dedupe = ["react", "react-dom", "@emotion/react"];
			},
		},
		swc(swcOptions) as any,
		react({
			fastRefresh: true,
		}),
		vendorChunks(chunkGroups),
	];
};
