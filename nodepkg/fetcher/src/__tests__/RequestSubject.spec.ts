import {describe, expect, it} from "vitest";
import {RequestSubject} from "../subject";

describe("RequestSubject", () => {
    describe("#success", () => {
        const rs$ = new RequestSubject({
            request: (c) => Promise.resolve(c.body),
            toHref: () => "",
        }, ((input: any) => ({body: input})) as any)

        const rets: any[] = []

        rs$.subscribe((resp) => rets.push(resp))

        it("request 1", async () => {
            rs$.next(1)
            await Promise.resolve()
            expect(rets).toEqual([1])
        })

        it("request 2", async () => {
            rs$.next(2)
            await Promise.resolve()
            expect(rets).toEqual([1, 2])
        })
    });

    describe("#failed", () => {
        const rs$ = new RequestSubject({
            request: (_) => Promise.reject("err"),
            toHref: () => "",
        }, ((input: any) => ({body: input})) as any)

        const rets: any[] = []

        rs$.error$.subscribe((resp) => rets.push(resp))

        it("request 1", async () => {
            rs$.next({x: 1})
            await Promise.resolve()
            expect(rets).toEqual(["err"])
        })

        it("request 2", async () => {
            rs$.next({x: 1})
            await Promise.resolve()
            expect(rets).toEqual(["err", "err"])
        })
    });
});
