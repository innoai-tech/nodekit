import {get, isFunction, isUndefined} from "@innoai-tech/lodash";
import {createContext, ReactNode, useContext, useEffect, useMemo} from "react";
import {BehaviorSubject, Observable, Subscription} from "rxjs";
import {map as rxMap, distinctUntilChanged} from "rxjs/operators";

export interface Persister {
    hydrate: () => any;
    connect: (store$: Store) => Subscription;
}

export class LocalStoragePersister implements Persister {
    static create(name: string): LocalStoragePersister {
        return new LocalStoragePersister(name);
    }

    constructor(private name: string) {
    }

    private load(key: string, defaults: any = {}) {
        try {
            const data = localStorage.getItem(`${this.name}$${key}`);
            return JSON.parse(data || "");
        } catch (_) {
            return defaults;
        }
    }

    private save(key: string, data: any) {
        try {
            localStorage.setItem(`${this.name}$${key}`, JSON.stringify(data));
        } catch (_) {
        }
    }

    private _state: { [k: string]: any } = {};

    connect(store$: Store) {
        return store$.subscribe((state) => {
            const keys = Object.keys(state);
            for (const k of keys) {
                if (state[k] !== this._state[k]) {
                    this.save(k, (this._state[k] = state[k]));
                }
            }
            this.save("_keys", keys);
        });
    }

    hydrate() {
        const keys = this.load("_keys", []);
        const state: { [k: string]: any } = {};
        for (const k of keys) {
            state[k] = this.load(k, {"meta": {}});
        }
        return (this._state = state);
    }
}

export interface DomainData<T, M extends object> {
    data: T;
    meta: M;
}

export class Store extends BehaviorSubject<{ [domain: string]: DomainData<any, {}> }> {
    static persist(p: Persister) {
        const store$ = new Store(p.hydrate())
        p.connect(store$)
        return store$;
    }

    domain<T extends any, M extends object = {}>(
        name: string,
        initial: T,
    ): Domain<T, M> {
        return new Domain(this, name, initial);
    }

    override next(v: any | ((prev: any) => any)) {
        super.next(isFunction(v) ? v(this.value) : v);
    }
}

const replace = (obj: any = {}, keyPath: string[], v: any): any => {
    if (keyPath.length === 0) {
        return obj;
    }

    const k = keyPath[0]!;

    if (keyPath.length === 1) {
        if (obj[k] === v) {
            return obj;
        }
        return {
            ...obj,
            [k]: v,
        };
    }

    const replaced = replace(obj[k], keyPath.slice(1), v);
    if (obj[k] === replaced) {
        return obj;
    }
    return {
        ...obj,
        [k]: replaced,
    };
};

export class LinkedBehaviorSubject<T> extends Observable<T> {
    private _value: T | undefined;

    get value(): T {
        if (isUndefined(this._value)) {
            this._value = get(this.from$.value, this.keyPath);
        }
        return this._value || this.defaults;
    }

    next(v: T | ((prev: T) => T)) {
        const action = (state: any) => {
            this._value = isFunction(v) ? v(this.value) : v;
            return replace(state, this.keyPath, this._value);
        }
        action.keyPath = this.keyPath
        this.from$.next(action);
    }

    constructor(private from$: BehaviorSubject<any>, private keyPath: string[], private defaults: T) {
        super((s) => {
            return this.from$.pipe(
                rxMap((state) => {
                    const value = get(state, this.keyPath);
                    if (value !== this._value) {
                        this._value = value;
                    }
                    return this._value;
                }),
                distinctUntilChanged(),
            ).subscribe(s);
        });
    }
}

export class Domain<T, M extends object> extends LinkedBehaviorSubject<T> {
    meta$ = new LinkedBehaviorSubject<M>(this.store$, [this.name, "meta"], {} as M);

    constructor(private store$: Store, private name: string, initials: T) {
        super(store$, [name, "data"], initials);
    }
}

const StoreContext = createContext({store$: new Store({})});

export const useStore$ = () => useContext(StoreContext).store$

export const useDomainStore$ = <T extends any>(domain: string, initials: T) => {
    const store$ = useStore$()
    return useMemo(() => store$.domain<T>(domain, initials), [domain])
}

export const StoreProvider = ({name, children}: {
    name: string;
    children: ReactNode;
}) => {
    const store$ = useMemo(() => Store.persist(LocalStoragePersister.create(name)), []);

    useEffect(() => {
        return () => store$.complete()
    }, [])

    return (
        <StoreContext.Provider value={{store$: store$}}>
            {children}
        </StoreContext.Provider>
    );
};