import {isFunction} from "@innoai-tech/lodash";
import {useMemo} from "react";
import {BehaviorSubject} from "rxjs";

export class StateSubject<T> extends BehaviorSubject<T> {
    override next = (value: T | ((value: T) => T)) => {
        super.next(isFunction(value) ? value(super.value) : value);
    }
}

export const useStateSubject = <T extends any>(initialValue: T | (() => T)) => {
    return useMemo(
        () => new StateSubject<T>(isFunction(initialValue) ? initialValue() : initialValue),
        [],
    );
};

