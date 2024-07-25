import { extname } from "path";
import { kebabCase, toLower } from "@innoai-tech/lodash";
import { type Loader, type TransformOptions, transform } from "esbuild";
import type { Plugin } from "rollup";
import ts from "typescript";

const defaultLoaders: { [ext: string]: Loader } = {
  ".js": "js",
  ".jsx": "jsx",
  ".ts": "ts",
  ".tsx": "tsx"
};

type CompilerOptions = {
  alwaysStrict?: boolean;
  importsNotUsedAsValues?: string;
  jsx?: string;
  jsxFactory?: string;
  jsxFragmentFactory?: string;
  jsxImportSource?: string;
  preserveValueImports?: boolean;
  target?: string;
  useDefineForClassFields?: boolean;
};

const loadTsCompilerOptions = (
  cwd: string,
  tsconfigFile: string
): CompilerOptions => {
  const configFileName = ts.findConfigFile(
    cwd,
    ts.sys.fileExists,
    tsconfigFile
  );

  if (configFileName) {
    const o = ts.parseJsonConfigFileContent(
      ts.readConfigFile(configFileName, ts.sys.readFile).config,
      ts.sys,
      cwd
    ).options;

    return {
      alwaysStrict: o.alwaysStrict,
      jsxFactory: o.jsxFactory,
      jsxFragmentFactory: o.jsxFragmentFactory,
      jsxImportSource: o.jsxImportSource,
      useDefineForClassFields: o.useDefineForClassFields,
      target: o.target ? toLower(ts.ScriptTarget[o.target]) : undefined,
      jsx: o.jsx ? kebabCase(ts.JsxEmit[o.jsx]) : undefined
    } as CompilerOptions;
  }

  return {};
};

export const esbuild = ({
                          loaders,
                          tsconfig,
                          ...options
                        }: TransformOptions & {
  tsconfig: string;
  loaders?: Record<string, Loader>;
}): Plugin => {
  const cwd = process.cwd();

  const compilerOptions = loadTsCompilerOptions(cwd, tsconfig);

  const allLoaders = {
    ...defaultLoaders,
    ...loaders
  };

  return {
    name: "monobundle/esbuild",

    async transform(code, id) {
      const ext = extname(id);
      const loader = allLoaders[ext];

      if (!loader) {
        return null;
      }

      const result = await transform(code, {
        ...options,
        tsconfigRaw: { compilerOptions: compilerOptions as any },
        loader,
        target: options.target || "defaults",
        sourcefile: id
      });

      return (
        result.code && {
          code: result.code,
          map: result.map || null
        }
      );
    }
  };
};
