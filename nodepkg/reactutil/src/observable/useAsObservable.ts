import {useEffect} from "react";
import {useStateSubject} from "./StateSubject";
import type {Observable} from "rxjs";

export const useAsObservable = <T extends any>(input: T): Observable<T> => {
    const v$ = useStateSubject(input)

    useEffect(() => {
        v$.next(input)
    }, [input])

    return v$;
}

