import type {FunctionComponent, ReactElement} from "react";
import type {Observable} from "rxjs";
import {ObservableWithValue, useObservableState} from "./useObservableState";


export function Subscribe<T extends any>(props: {
    value$: ObservableWithValue<T>;
    children: (v: T) => ReactElement | null;
}): ReturnType<FunctionComponent>;
export function Subscribe<T extends any>(props: {
    value$: Observable<T>
    children: (v: T | undefined) => ReactElement | null;
}): ReturnType<FunctionComponent>;
export function Subscribe<T extends any>(props: {
    value$: ObservableWithValue<T> | Observable<T>;
    children: (v: T | undefined) => ReturnType<FunctionComponent>;
}): ReturnType<FunctionComponent> {
    return props.children(useObservableState<T>(props.value$));
}