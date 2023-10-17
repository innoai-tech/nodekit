#!/bin/env bun
import { BunFig, publish, withoutWorkspace } from "../";

const cwd = process.cwd();

const bunFig = await BunFig.load(cwd);

const m = await bunFig.manifest();
const workspaces = m._resolvedWorkspaces ?? {};

for (const m in workspaces) {
  const w = workspaces[m]!;
  await withoutWorkspace(
    w,
    () => {
      return publish(w._from, bunFig);
    },
    workspaces,
  );
}
