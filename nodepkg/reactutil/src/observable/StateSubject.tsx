import {isFunction} from "@innoai-tech/lodash";
import {BehaviorSubject} from "rxjs";
import {useMemoObservable} from "./useMemoObservable";

export class StateSubject<T> extends BehaviorSubject<T> {
    static override create<T>(initialValue: T | (() => T)) {
        return new StateSubject<T>(isFunction(initialValue) ? initialValue() : initialValue)
    }

    override next = (value: T | ((value: T) => T)) => {
        super.next(isFunction(value) ? value(super.value) : value);
    }
}

export const useStateSubject = <T extends any>(initialValue: T | (() => T)) => {
    return useMemoObservable(() => StateSubject.create<T>(initialValue));
};

