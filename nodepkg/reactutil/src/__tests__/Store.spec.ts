import {LocalStoragePersister, Store} from "../Store";
import {act, renderHook} from "@testing-library/react";
import {test, describe, expect} from "vitest";
import {useObservableState} from "..";
import {get} from "@innoai-tech/lodash";

/**
 *  @vitest-environment jsdom
 **/
describe("When render hook with BehaviorSubject, should use default value", () => {
    const store$ = Store.create({});

    interface LogonUser {
        name: string;
    }

    const defaults = {"x": "-"} as any;
    const logonUser$ = store$.domain<LogonUser>("user", defaults);

    test("when first render, should return default object.", () => {
        const hook = renderHook(() => useObservableState(logonUser$));
        expect(hook.result.current).toBe(defaults);
    });

    test("when set state, should return updated date.", () => {
        act(() =>
            logonUser$.next((_) => ({
                name: "hello",
            }))
        );
        const hook = renderHook(() => useObservableState(logonUser$));
        hook.unmount();

        expect(hook.result.current).toEqual({name: "hello"});
        expect(store$.value["user"]!.data).toEqual({name: "hello"});
    });

    test("when set meta, should return updated meta.", () => {
        const meta = {expireAt: Date.now()};

        act(() => logonUser$.meta$.next(meta));

        const {result, unmount} = renderHook(() =>
            useObservableState(logonUser$.meta$)
        );
        unmount();

        expect(result.current).toEqual(meta);
        expect(store$.value["user"]!.meta).toEqual(meta);
    });

    test("when set state, should sync to all domain observers.", () => {
        act(() =>
            logonUser$.next((_) => ({
                name: "hello2",
            }))
        );

        const logonUser2$ = store$.domain<LogonUser>("user", {} as any);

        const {result, unmount} = renderHook(() => useObservableState(logonUser2$));
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
