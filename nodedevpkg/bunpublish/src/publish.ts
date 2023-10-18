import { tarball, manifest } from "pacote";
import { publish as npmPublish } from "libnpmpublish";
// @ts-ignore
import { Arborist } from "@npmcli/arborist";
import type { BunFig } from "./bunfig";

export const publish = async (dir: string, bunFig: BunFig) => {
  const m = await manifest(dir);
  if ((m as any)["private"]) {
    return;
  }

  console.log(`${m._id} publishing...`);

  const tar = await tarball(m._from, { Arborist });
  const reg = bunFig.pickRegistry(m.name);

  try {
    const headers: Record<string, string> = {};

    const token = reg.token;
    if (token) {
      headers["authorization"] = token;
    }

    await npmPublish(m as any, tar, {
      registry: reg.url,
      headers: headers
    });

    console.log(`${m._id} publish success.`);
  } catch (err: any) {
    // skip conflict
    if (err.code == "E409") {
      console.log(`${m._id} publish skip.`);
      return;
    }
    throw err;
  }
};
