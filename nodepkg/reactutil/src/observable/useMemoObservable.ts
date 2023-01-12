import {isFunction} from "@innoai-tech/lodash";
import {DependencyList, useMemo} from "react";
import type {Observable} from "rxjs";

export function useMemoObservable<T>(
    observableOrCreator: Observable<T> | (() => Observable<T>),
    deps: DependencyList = []
): Observable<T> {
    return useMemo(() => isFunction(observableOrCreator) ? observableOrCreator() : observableOrCreator, deps);
}
