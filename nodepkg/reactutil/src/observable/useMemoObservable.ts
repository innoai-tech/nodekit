import {isFunction} from "@innoai-tech/lodash";
import {DependencyList, useMemo} from "react";
import type {Observable} from "rxjs";

export function useMemoObservable<O extends Observable<any>>(
    observableOrCreator: O | (() => O),
    deps: DependencyList = []
): O {
    return useMemo(() => isFunction(observableOrCreator) ? observableOrCreator() : observableOrCreator, deps);
}
