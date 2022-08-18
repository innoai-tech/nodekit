import browserslist from "browserslist";

const SUPPORTED_BUILD_TARGETS = [
	"es", "node", "chrome", "edge", "firefox", "ios", "safari",
];

export function getBuildTargets(target: string | string[]) {
	const getEveryTar = browserslist(target).reverse();

	const sep = " ";
	const targets = [];
	let singleTar = "";
	let i = 0;

	for (const tar of getEveryTar) {
		for (const selTar of SUPPORTED_BUILD_TARGETS) {
			if (tar.startsWith(selTar + sep) && !singleTar.startsWith(selTar)) {
				i++;
				singleTar = tar.replace(sep, "");
				targets[i] = singleTar;
			}
		}
	}

	return targets.filter(Boolean);
}
