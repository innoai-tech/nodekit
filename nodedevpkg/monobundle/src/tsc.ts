import { spawn } from "child_process";

export const tsc = async (
	projectRoot: string,
	outDir: string,
): Promise<void> => {
	const ps = spawn("tsc", [
		"--diagnostics",
		"--emitDeclarationOnly",
		"--baseUrl",
		".",
		"--outDir",
		outDir,
		"-p",
		".",
	], {
		cwd: projectRoot,
	});

	// ps.stdout.on("data", (data) => {
	//   console.log(`${data}`);
	// });

	ps.stderr?.on("data", (data) => {
		console.error(`${data}`);
	});

	return new Promise((resolve, reject) => {
		ps.on("close", (code) => {
			if (code !== 0) {
				reject();
				return;
			}
			resolve();
		});
	});
};
