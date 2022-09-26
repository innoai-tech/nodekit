import {LocalStoragePersister, Store} from "../Store";
import {act, renderHook} from "@testing-library/react";
import {test, describe, expect} from "vitest";
import {useObservable} from "../observable";
import {get} from "@innoai-tech/lodash";

/**
 *  @vitest-environment jsdom
 **/
describe("When render hook with BehaviorSubject, should use default value", () => {
    const store$ = new Store({});

    interface LogonUser {
        name: string;
    }

    const logonUser$ = store$.domain<LogonUser>("user", {} as any);

    test("when first render, should return undefined.", () => {
        const {result} = renderHook(() => useObservable(logonUser$));
        expect(result.current).toBe(undefined);
    });

    test("when set state, should return updated date.", () => {
        act(() => logonUser$.next((_) => ({name: "hello"})));
        const {result, unmount} = renderHook(() => useObservable(logonUser$));
        unmount();

        expect(result.current).toEqual({name: "hello"});
        expect(store$.value["user"]!.data).toEqual({name: "hello"});
    });

    test("when set meta, should return updated meta.", () => {
        const meta = {expireAt: Date.now()};

        act(() => logonUser$.meta$.next(meta));

        const {result, unmount} = renderHook(
            () => useObservable(logonUser$.meta$),
        );
        unmount();

        expect(result.current).toEqual(meta);
        expect(store$.value["user"]!.meta).toEqual(meta);
    });

    test("when set state, should sync to all domain observers.", () => {
        act(
            () =>
                logonUser$.next(
                    (_) => ({
                        name: "hello2",
                    }),
                ),
        );

        const logonUser2$ = store$.domain<LogonUser>("user", {} as any);

        const {result, unmount} = renderHook(() => useObservable(logonUser2$));
        unmount();

        expect(result.current).toEqual({
            name: "hello2",
        });
    });

    test("Persister", () => {
        const p = new LocalStoragePersister("test");
        const sub = p.connect(store$);
        logonUser$.next({
            name: "hello x",
        });

        logonUser$.next((v) => v);
        logonUser$.next((v) => v);

        sub.unsubscribe();

        expect(get(p.hydrate(), ["user", "data"])).toEqual({
            name: "hello x",
        });
    });
});
