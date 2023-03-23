import { spawn } from "child_process";

export const tsc = async (
  projectRoot: string,
  outDir: string,
  tsconfig: string
): Promise<void> => {
  const ps = spawn(
    "tsc",
    [
      "--incremental",
      "--emitDeclarationOnly",
      "--baseUrl",
      ".",
      "--outDir",
      outDir,
      "-p",
      tsconfig
    ],
    {
      cwd: projectRoot
    }
  );

  return new Promise((resolve, reject) => {
    ps.stdout.on("data", (data) => {
      if (data) {
        reject(`${data}`);
      }
    });

    ps.stderr?.on("data", (data) => {
      console.error(`${data}`);
    });

    ps.on("close", (code) => {
      if (code !== 0) {
        reject();
        return;
      }
      resolve();
    });
  });
};
