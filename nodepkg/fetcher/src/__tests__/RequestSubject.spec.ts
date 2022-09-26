import {describe, expect, it} from "vitest";
import {createRequestSubject} from "../subject";

describe("RequestSubject", () => {
    describe("#success", () => {
        const rs$ = createRequestSubject(
            ((input: any) => ({body: input})) as any,
            {
                request: (c) => Promise.resolve(c.body),
                toHref: () => "",
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
            ((input: any) => ({body: input})) as any,
            {
                request: (_) => Promise.reject("err"),
                toHref: () => "",
            },
        );

        const rets: any[] = [];

        rs$.error$.subscribe((resp) => rets.push(resp));

        it("request 1", async () => {
            rs$.next({x: 1});
            await Promise.resolve();
            expect(rets).toEqual(["err"]);
        });

        it("request 2", async () => {
            rs$.next({x: 1});
            await Promise.resolve();
            expect(rets).toEqual(["err", "err"]);
        });
    });
});
