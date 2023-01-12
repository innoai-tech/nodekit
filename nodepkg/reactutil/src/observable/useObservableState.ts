import {useState} from "react";
import {Observable, tap} from "rxjs";
import {useObservableEffect} from "./useObservableEffect";

export interface ObservableWithValue<T> extends Observable<T> {
    value: T;
}

export function useObservableState<T extends any>(ob$: ObservableWithValue<T>): T;
export function useObservableState<T extends any>(ob$: Observable<T>, initialValue?: T): T | undefined;
export function useObservableState<T extends any>(ob$: Observable<T> | ObservableWithValue<T>, initialValue?: T): T | undefined {
    const [s, up] = useState(() => {
        initialValue ??= (ob$ as any).value;
        return initialValue;
    });

    useObservableEffect(
        () => ob$.pipe(tap((resp) => up(resp))),
        [ob$],
    );

    return s;
}

