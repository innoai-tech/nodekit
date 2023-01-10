import {defineConfig} from "vite";
import {app, presetReact} from "@innoai-tech/vite-presets";

export default defineConfig({
    plugins: [
        app("example"),
        presetReact({
            chunkGroups: {
                utils: [
                    "date-fns",
                    "rxjs",
                    "fp-ts",
                    "filesize",
                    "buffer",
                    "@innoai-tech/lodash",
                ],
                uikit: [
                    "react",
                    "react-dom",
                    "react-router",
                    "react-router-dom",
                    "@innoai-tech/*",
                ],
                "ui": [
                    "@emotion/*",
                    "@mui/*",
                ]
            },
        }),
    ],
});
