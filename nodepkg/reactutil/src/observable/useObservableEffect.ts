import { isFunction } from "@innoai-tech/lodash";
import { type DependencyList, useEffect } from "react";
import type { Observable } from "rxjs";

export function useObservableEffect<T>(
  observableOrCreator: Observable<T> | (() => Observable<T> | undefined),
  deps: DependencyList = []
) {
  useEffect(() => {
    const ob$ = isFunction(observableOrCreator) ? observableOrCreator() : observableOrCreator;
    if (!ob$) {
      return;
    }
    const s = ob$.subscribe();
    return () => s.unsubscribe();
  }, deps);
}
