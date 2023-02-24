import {test, describe, expect} from "vitest";
import {map, of} from "rxjs";
import {useObservableState, StateSubject, useAsObservable, useMemoObservable} from "..";
import {act, renderHook} from "@testing-library/react";

/**
 *  @vitest-environment jsdom
 **/
describe("rx to react", () => {
    test("when first render, should use the first ", () => {
        const hook = renderHook(() => useObservableState(of(1)));
        expect(hook.result.current).toBe(1);
    });

    test("when state changed, should rerender", () => {
        const s$ = StateSubject.create(1)
        const hook = renderHook(() => useObservableState(s$));
        act(() => s$.next(2));
        expect(hook.result.current).toBe(2);
    })

    test("when rerender with new observable, should re-initial", () => {
        const s$ = StateSubject.create(1)
        const hook = renderHook(({s$}) => useObservableState(s$), {
            initialProps: {s$: s$}
        });
        hook.rerender({s$: StateSubject.create(10)})
        expect(hook.result.current).toBe(10);
    })
});

describe("react to rx", () => {
    const hook = renderHook(({input}) => {
        const input$ = useAsObservable(input)
        const calc$ = useMemoObservable(input$.pipe(map((v) => v * v)))
        return useObservableState(calc$)
    }, {
        initialProps: {input: 2}
    });

    test("when first render, should got initial value", () => {
        expect(hook.result.current).toBe(4);
    });

    test("when re render, should got new value", () => {
        hook.rerender({input: 3})
        expect(hook.result.current).toBe(9);
    });
})
