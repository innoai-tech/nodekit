import type {PluginOption} from "vite";
import {ChunksGroups, vendorChunks} from "./vendorChunks";
import react from "@vitejs/plugin-react";

export const presetReact = ({
                                chunkGroups,
                            }: {
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
        react({
            fastRefresh: true,
        }),
        vendorChunks(chunkGroups),
    ];
};


