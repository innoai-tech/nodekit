import {isFunction} from "@innoai-tech/lodash";
import {
    BehaviorSubject,
    from,
    Observable,
    of,
    Subject,
} from "rxjs";
import {
    tap,
    mergeMap,
    catchError,
    ignoreElements,
} from "rxjs/operators"
import type {
    Fetcher,
    FetcherErrorResponse,
    FetcherResponse,
    RequestConfigCreator,
} from "./fetcher";

export class RequestSubject<TInputs, TBody, TError> extends Observable<FetcherResponse<TInputs, TBody>> {
    requesting$ = new BehaviorSubject<boolean>(false);
    error$ = new Subject<FetcherErrorResponse<TInputs, TError>>();

    private _success$ = new Subject<FetcherResponse<TInputs, TBody>>();
    private _input$ = new Subject<TInputs>();

    constructor(
        private fetcher: Fetcher,
        private createConfig: RequestConfigCreator<TInputs, TBody>,
    ) {
        super((subscriber) => {
            return this._success$.subscribe(subscriber);
        });
    }

    unsubscribe = this._input$.pipe(
        mergeMap((input) => {
            this.requesting$.next(true);

            return from(this.fetcher.request<TInputs, TBody>(this.createConfig(input))).pipe(
                tap((resp) => this._success$.next(resp)),
                catchError((errorResp) => {
                    this.error$.next(errorResp);
                    return of(errorResp)
                }),
            );
        }),
        tap(() => {
            this.requesting$.next(false);
        }),
        ignoreElements(),
    ).subscribe()

    private _prevInputs?: TInputs

    next(inputs: TInputs | ((prevInputs?: TInputs) => TInputs)) {
        this._input$.next(
            this._prevInputs = (isFunction(inputs) ? inputs(this._prevInputs) : inputs),
        );
    }

    toHref(value: TInputs): string {
        return this.fetcher.toHref(this.createConfig(value));
    }
}

export interface StandardRespError {
    code: number;
    msg: string;
    desc: string;
}
