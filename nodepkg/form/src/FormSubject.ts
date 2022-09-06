import {Observable, BehaviorSubject, Subject, merge} from "rxjs";
import {map as rxMap, distinctUntilChanged} from "rxjs/operators";
import {get, isEmpty, set} from "@innoai-tech/lodash";
import type {InferSchema, Schema} from "./Schema";
import {validateForSchema} from "./Validation";
import {
    create,
    ExpressionFunc,
    keyPathToSchemaKeyPath,
    walkExpression,
} from "./Expression";

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
        const errors = validateForSchema(this.schema)(this.inputs$.value);

        if (isEmpty(errors)) {
            this.values$.next({...(this.inputs$.value as T)});
        } else {
            this.setErrors(errors);
        }
    };

    register(keyPath: string, watches: string[] = []) {
        this.fields$.next({
            ...this.fields$.value,
            [keyPath]: {},
        });

        const schema = get(
            {rootSchema: this.schema},
            keyPathToSchemaKeyPath(keyPath),
            {},
        );

        walkExpression(schema.need || [], (name, args) => {
            if (name === "at") {
                watches = [...watches, args[0]];
            }
        });

        // TODO find way to infer type
        return new FieldSubject(keyPath, this.fields$, this.inputs$, {
            watches,
            schema: schema,
            rootSchema: this.schema,
        });
    }
}

export class FieldSubject<T extends any = any> extends Observable<FieldState & { name: string; value: T }> {
    constructor(
        protected name: string,
        private fields$: BehaviorSubject<{ [k: string]: FieldState }>,
        private inputs$: BehaviorSubject<object>,
        private context: {
            schema: Schema;
            rootSchema: Schema;
            watches: string[];
        },
    ) {
        super((subscriber) => {
            const streams = [
                ...context.watches.map(
                    (keyPath) =>
                        this.inputs$.pipe(
                            rxMap((values) => get(values, keyPath)),
                            distinctUntilChanged(),
                        ),
                ),
                this.inputs$.pipe(
                    rxMap((values) => get(values, this.name)),
                    distinctUntilChanged(),
                ),
                this.fields$.pipe(
                    rxMap((fieldStates) => fieldStates[this.name]),
                    distinctUntilChanged(),
                ),
            ];

            return merge(...streams)
                .pipe(rxMap(() => this.value))
                .subscribe(subscriber);
        });
    }

    public next(value: any) {
        this.setFieldState({
            dirty: true,
        });
        this.inputs$.next({
            ...set(this.inputs$.value, this.name, value),
        });
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

    public check(validate?: ExpressionFunc<T, boolean>) {
        if (validate && !validate(this.value.value)) {
            this.setFieldState({error: (validate as any).errMsg});
        }
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

    public get value() {
        return ({
            ...(this.fields$.value[this.name] || ({} as any)),
            name: this.name,
            value: get(this.inputs$.value, this.name),
        });
    }

    public get validate() {
        return this.context.schema.need
            ? create<T, boolean>(this.context.schema.need)({
                root: this.inputs$.value,
                path: this.name,
                schema: this.context.schema,
                rootSchema: this.context.rootSchema,
            })
            : undefined;
    }
}
