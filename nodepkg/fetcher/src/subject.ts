import {isFunction} from "@innoai-tech/lodash";
import {BehaviorSubject, from, Observable, of, Subject} from "rxjs";
import {tap, mergeMap, catchError, ignoreElements} from "rxjs/operators";
import type {
    Fetcher,
    FetcherErrorResponse,
    FetcherResponse,
    RequestConfigCreator,
} from "./fetcher";


export interface StandardRespError {
    code: number;
    msg: string;
    desc: string;
}

export interface RequestSubject<TInputs, TBody, TError> extends Observable<FetcherResponse<TInputs, TBody>> {
    operationID: string
    requesting$: BehaviorSubject<boolean>
    error$: Subject<FetcherErrorResponse<TInputs, TError>>

    next(inputs: TInputs | ((prevInputs?: TInputs) => TInputs)): void

    toHref(value: TInputs): string
}

export const createRequestSubject = <TInputs, TBody, TError>(
    createConfig: RequestConfigCreator<TInputs, TBody>,
    fetcher: Fetcher
): RequestSubject<TInputs, TBody, TError> => {
    return new ReqSubject(createConfig, fetcher)
}

class ReqSubject<TInputs, TBody, TError> extends Observable<FetcherResponse<TInputs, TBody>> implements RequestSubject<TInputs, TBody, TError> {
    requesting$ = new BehaviorSubject<boolean>(false);
    error$ = new Subject<FetcherErrorResponse<TInputs, TError>>();

    private _success$ = new Subject<FetcherResponse<TInputs, TBody>>();
    private _input$ = new Subject<TInputs>();

    constructor(
        private createConfig: RequestConfigCreator<TInputs, TBody>,
        private fetcher: Fetcher,
    ) {
        super((subscriber) => {
            return this._success$.subscribe(subscriber);
        });
    }

    get operationID() {
        return this.createConfig.operationID;
    }

    unsubscribe = this._input$.pipe(
        mergeMap((input) => {
            this.requesting$.next(true);

            return from(
                this.fetcher.request<TInputs, TBody>(this.createConfig(input)),
            ).pipe(
                tap((resp) => this._success$.next(resp)),
                catchError((errorResp) => {
                    this.error$.next(errorResp);
                    return of(errorResp);
                }),
            );
        }),
        tap(() => {
            this.requesting$.next(false);
        }),
        ignoreElements(),
    ).subscribe();

    private _prevInputs?: TInputs;

    next(inputs: TInputs | ((prevInputs?: TInputs) => TInputs)) {
        this._input$.next(
            (this._prevInputs = isFunction(inputs)
                ? inputs(this._prevInputs)
                : inputs),
        );
    }

    toHref(value: TInputs): string {
        return this.fetcher.toHref(this.createConfig(value));
    }
}

