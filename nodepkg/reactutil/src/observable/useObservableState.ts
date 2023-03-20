import { useMemo, useState } from "react";
import { type Subscription, type BehaviorSubject, type Observable, Subject, tap } from "rxjs";
import { useObservableEffect } from "./useObservableEffect";

export function useObservableState<T extends any>(ob$: BehaviorSubject<T>): T;
export function useObservableState<T extends any>(ob$: Observable<T>, initialValue?: T): T | undefined;
export function useObservableState<T extends any>(ob$: Observable<T> | BehaviorSubject<T>, initialValue?: T): T | undefined {
  const bridge = useMemo(() => ({
    output$: new Subject<T>(),
    value: null as (T | null),
    input$: null as (Observable<T> | null),
    subscription: null as (Subscription | null)
  }), []);


  if (!Object.is(bridge.input$, ob$)) {
    bridge.subscription?.unsubscribe();
    bridge.subscription = ob$.pipe(tap((value) => bridge.value = value)).subscribe(bridge.output$);
    bridge.input$ = ob$;
  }

  const [value, up] = useState(() => bridge.value ?? initialValue);

  useObservableEffect(() => bridge.output$.pipe(tap(up)));

  return value;
}

