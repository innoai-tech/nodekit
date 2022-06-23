export default {
    "maxConcurrency": 10,
    "transform": {
        "^.+\\.[t|j]sx?$": "babel-jest",
    },
    "moduleNameMapper": {
        "^@innoai-tech/lodash$": "<rootDir>/@innoai-tech/lodash/index.mjs",
        "^@innoai-tech/([^/]+)$": "<rootDir>/@innoai-tech/$1/src/index.ts",

        // TODO remove until fixed https://github.com/facebook/jest/issues/12270
        "#ansi-styles": "<rootDir>/@innoai-tech/monobundle/node_modules/chalk/source/vendor/ansi-styles/index.js",
        "#supports-color": "<rootDir>/@innoai-tech/monobundle/node_modules/chalk/source/vendor/supports-color/index.js",
    },
    "moduleFileExtensions": ["tsx", "ts", "json", "jsx", "js"],
    "extensionsToTreatAsEsm": [".tsx", ".ts"],
    "modulePaths": ["<rootDir>"],
    "testPathIgnorePatterns": ["/node_modules/"],
    "testRegex": ".*/__tests__/.+\\.(generator|test|spec)\\.(ts|tsx)$",
};