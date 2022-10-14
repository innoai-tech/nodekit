import { defineConfig } from "vite";
import { app, presetReact } from "@innoai-tech/vite-presets";

export default defineConfig({
  plugins: [
    app("example"),
    presetReact({
      chunkGroups: {
        core: /rollup|core-js|tslib|babel|scheduler|history|object-assign|hey-listen|react|react-router/,
        utils: /innoai-tech|date-fns|lodash|rxjs|filesize|buffer/,
        styling: /emotion|react-spring|mui/,
      },
    }),
  ],
});
