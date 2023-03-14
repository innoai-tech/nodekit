import browserslist from "browserslist";

const SUPPORTED_BUILD_TARGETS = [
  "es",
  "node",
  "chrome",
  "edge",
  "firefox",
  "ios",
  "safari"
];

export function getBuildTargets(target: string | string[]) {
  const getEveryTar = browserslist(target).reverse();

  const sep = " ";

  const targets: Record<string, string> = {};

  for (const tar of getEveryTar) {
    for (const selTar of SUPPORTED_BUILD_TARGETS) {
      const parts = tar.split(sep);
      if (tar.startsWith(selTar + sep) && !targets[parts[0]!]) {
        targets[parts[0]!] = parts[1]!;
      }
    }
  }

  return targets;
}
