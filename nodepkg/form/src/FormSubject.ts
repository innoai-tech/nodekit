import {Observable, BehaviorSubject, Subject, merge} from "rxjs";
import {map as rxMap, distinctUntilChanged} from "rxjs/operators";
import {get, isEmpty, set} from "@innoai-tech/lodash";
import type {InferSchema, Schema} from "./Schema";
import {validateForSchema} from "./validation";

export interface FieldState {
    // focusing
    active?: boolean;
    // value updates
    dirty?: boolean;
    // blurred
    touched?: boolean;
    // focused
    visited?: boolean;
    // error msg
    error?: string;
}

export class FormSubject<T extends object> extends Observable<T> {
    static of<T extends object>(
        schema: InferSchema<T>,
        initials: Partial<T> = {},
    ) {
        return new FormSubject(schema, initials);
    }

    private fields$ = new BehaviorSubject<{ [k: string]: FieldState }>({});

    public inputs$: BehaviorSubject<Partial<T>>;
    // for notify valid values
    public values$ = new Subject<T>();

    constructor(
        public schema: InferSchema<T>,
        private initials: Partial<T> = {},
    ) {
        super((subscriber) => {
            return this.values$.subscribe(subscriber);
        });
        this.inputs$ = new BehaviorSubject<Partial<T>>(this.initials);
    }

    setErrors = (errors: { [k: string]: string } = {}) => {
        const fields = this.fields$.value;

        for (const keyPath in errors) {
            if (fields[keyPath]) {
                fields[keyPath] = {
                    ...fields[keyPath],
                    error: errors[keyPath] || "",
                    visited: true,
                };
            }
        }

        this.fields$.next(fields);
    };

    submit = () => {
        const errors = validateForSchema(this.schema)(this.inputs$.value, {});

        if (isEmpty(errors)) {
            this.values$.next({...this.inputs$.value as T});
        } else {
            this.setErrors(errors)
        }
    }

    register(keyPath: string) {
        this.fields$.next({
            ...this.fields$.value,
            [keyPath]: {},
        });
        return new FieldSubject(keyPath, this.inputs$, this.fields$, this.schema);
    }
}

export class FieldSubject extends Observable<FieldState> {
    get value() {
        return {
            ...(this.fields$.value[this.name] || {}),
            value: get(this.inputs$.value, this.name),
            name: this.name,
        };
    }

    constructor(
        private name: string,
        private inputs$: BehaviorSubject<any>,
        private fields$: BehaviorSubject<{ [k: string]: FieldState }>,
        private schema: Schema,
    ) {
        super((subscriber) => {
            const fieldValue$ = this.inputs$.pipe(
                rxMap((values) => get(values, this.name)),
                distinctUntilChanged(),
            );

            const fieldState$ = this.fields$.pipe(
                rxMap((fieldStates) => fieldStates[this.name]),
                distinctUntilChanged(),
            );

            return merge(fieldValue$, fieldState$)
                .pipe(rxMap(() => this.value))
                .subscribe(subscriber);
        });
    }

    private setFieldState(changed: Partial<FieldState>) {
        this.fields$.next({
            ...this.fields$.value,
            [this.name]: {
                ...(this.fields$.value[this.name] || {}),
                ...changed,
            },
        });
    }

    public next(value: any) {
        this.setFieldState({
            dirty: true,
        });
        this.inputs$.next(set(this.inputs$.value, this.name, value));
    }

    public focus() {
        this.setFieldState({
            active: true,
            visited: true,
            error: "",
        });
    }

    public blur() {
        this.setFieldState({
            active: false,
            dirty: true,
        });
    }

    validate() {
        try {
            // this.schema.validateSyncAt(this.name, this.inputs$.value);
        } catch (e) {
            // if (e instanceof ValidationError) {
            //     this.setFieldState({
            //         error: e.message,
            //     });
            // }
        }
    }
}
