import { test, expect } from "vitest";
import { useObservable } from "..";
import { act, renderHook } from "@testing-library/react";
import { BehaviorSubject } from "rxjs";

/**
 *  @vitest-environment jsdom
 **/
test("When render hook with BehaviorSubject, should use default value", () => {
	const s$ = new BehaviorSubject(1);
	const { result } = renderHook(() => useObservable(s$));
	expect(result.current).toBe(1);

	test("when state changed, should rerender", () => {
		act(() => s$.next(2));
		expect(result.current).toBe(2);
	});
});
