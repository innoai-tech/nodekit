import { describe, expect, it } from "bun:test";
import { createRequestSubject } from "../RequestSubject.ts";

describe("RequestSubject", () => {
  describe("#success", () => {
    const rs$ = createRequestSubject(
      ((input: any) => ({ body: input })) as any,
      {
        build: (c) => c,
        request: (c) => Promise.resolve(c.body),
        toHref: () => "",
        toRequestBody: () => undefined,
      },
    );

    const rets: any[] = [];

    rs$.subscribe((resp) => rets.push(resp));

    it("request 1", async () => {
      rs$.next(1);
      await Promise.resolve();
      expect(rets).toEqual([1]);
    });

    it("request 2", async () => {
      rs$.next(2);
      await Promise.resolve();
      expect(rets).toEqual([1, 2]);
    });
  });

  describe("#failed", () => {
    const rs$ = createRequestSubject(
      ((input: any) => ({ body: input })) as any,
      {
        build: (c) => c,
        request: (_) => Promise.reject("err"),
        toHref: () => "",
        toRequestBody: () => undefined,
      },
    );

    const rets: any[] = [];

    rs$.error$.subscribe((resp) => rets.push(resp));

    it("request 1", async () => {
      rs$.next({ x: 1 });
      await Promise.resolve();
      expect(rets).toEqual(["err"]);
    });

    it("request 2", async () => {
      rs$.next({ x: 1 });
      await Promise.resolve();
      expect(rets).toEqual(["err", "err"]);
    });
  });
});
