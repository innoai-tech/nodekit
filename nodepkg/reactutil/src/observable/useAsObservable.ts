import {useStateSubject} from "./StateSubject";
import type {Observable} from "rxjs";

export const useAsObservable = <T extends any>(input: T): Observable<T> => {
    const value$ = useStateSubject(input)
    if (!Object.is(value$.value, input)) {
        value$.next(input)
    }
    return value$;
}

