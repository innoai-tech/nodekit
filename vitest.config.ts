import {defineConfig} from "vitest/config"

export default defineConfig({
    test: {
        watch: false,
        include: [
            "@innoai-tech/**/__tests__/*.{generator,test,spec}.{ts,tsx}",
        ],
    },
})