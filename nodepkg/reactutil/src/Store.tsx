import { get, isFunction, isUndefined, endsWith } from "@innoai-tech/lodash";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo
} from "react";
import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { map as rxMap, distinctUntilChanged } from "rxjs";

export interface DomainData<T, M extends object> {
  data: T;
  meta: M;
}

export class Store extends BehaviorSubject<{ [domain: string]: DomainData<any, {}> }> {
  static override create(initials: { [domain: string]: DomainData<any, {}> }) {
    return new Store(initials);
  }

  static persist(p: Persister) {
    const store$ = Store.create(p.hydrate());
    p.connect(store$);
    return store$;
  }

  domain<T extends any, M extends object = {}>(
    name: string,
    initial: T
  ): Domain<T, M> {
    return new Domain(this, name, initial);
  }

  override next = (v: any | ((prev: any) => any)) => {
    super.next(isFunction(v) ? v(this.value) : v);
  };
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
      [k]: v
    };
  }

  const replaced = replace(obj[k], keyPath.slice(1), v);
  if (obj[k] === replaced) {
    return obj;
  }
  return {
    ...obj,
    [k]: replaced
  };
};

export class LinkedBehaviorSubject<T> extends Observable<T> {
  private _value: T | undefined;

  get value(): T {
    if (isUndefined(this._value)) {
      this._value = this._getOrigin(this.origin$.value);
    }
    return this._value!;
  }

  _getOrigin: (state: any) => T;
  _replaceOrigin: (state: any, value: T) => any;

  constructor(
    private origin$: BehaviorSubject<any>,
    keyPath: string[],
    defaults: T
  ) {
    super((s) => {
      return this.origin$
        .pipe(
          rxMap((state) => {
            const value = this._getOrigin(state);
            if (value !== this._value) {
              this._value = value;
            }
            return this._value;
          }),
          distinctUntilChanged()
        )
        .subscribe(s);
    });

    this._getOrigin = (state: any) => get(state, keyPath, defaults);
    this._replaceOrigin = (state: any, value: T) =>
      replace(state, keyPath, value);
  }

  next = (v: T | ((prev: T) => T)) => {
    this.origin$.next((state: any) =>
      this._replaceOrigin(
        state,
        (this._value = isFunction(v) ? v(this.value) : v)
      )
    );
  };
}

export class Domain<T, M extends object> extends LinkedBehaviorSubject<T> {
  meta$: LinkedBehaviorSubject<M>;

  constructor(store$: Store, public name: string, initials: T) {
    super(store$, [name, "data"], initials);

    this.meta$ = new LinkedBehaviorSubject<M>(
      store$,
      [this.name, "meta"],
      {} as M
    );
  }
}

const StoreContext = createContext({ store$: Store.create({}) });

export const useStore$ = () => useContext(StoreContext).store$;

export const useDomainStore$ = <T extends any>(domain: string, initials: T) => {
  const store$ = useStore$();
  return useMemo(() => store$.domain<T>(domain, initials), [domain]);
};

export const StoreProvider = ({
                                name,
                                children
                              }: {
  name: string;
  children: ReactNode;
}) => {
  const store$ = useMemo(
    () => Store.persist(LocalStoragePersister.create(name)),
    []
  );

  useEffect(() => {
    return () => store$.complete();
  }, []);

  return (
    <StoreContext.Provider value={{ store$: store$ }}>
      {children}
    </StoreContext.Provider>
  );
};

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

  private isPersistKey(key: string) {
    return !endsWith(key, "?");
  }

  private load(key: string, defaults?: any) {
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
        if (this.isPersistKey(k)) {
          if (state[k] !== this._state[k]) {
            this.save(k, (this._state[k] = state[k]));
          }
        }
      }
      this.save("_keys", keys);
    });
  }

  hydrate() {
    const keys = this.load("_keys", []);
    const state: { [k: string]: any } = {};
    for (const k of keys) {
      if (this.isPersistKey(k)) {
        state[k] = this.load(k);
      }
    }
    return (this._state = state);
  }
}
