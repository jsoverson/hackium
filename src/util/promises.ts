import { Func } from 'mocha';
import { time } from 'console';

export function isPromise<T>(a: T | Promise<T>): a is Promise<T> {
  return typeof a === 'object' && 'then' in a && typeof a.then === 'function';
}

export function waterfallMap<T, J>(array: J[], iterator: (el: J, i: number) => T | Promise<T>): Promise<T[]> {
  const reducer = (accumulator: Promise<T[]>, next: J, i: number): Promise<T[]> => {
    return accumulator.then((result) => {
      const iteratorReturnValue = iterator(next, i);
      if (isPromise(iteratorReturnValue)) return iteratorReturnValue.then((newNode) => result.concat(newNode));
      else return Promise.resolve(result.concat(iteratorReturnValue));
    });
  };

  return array.reduce(reducer, Promise.resolve([]));
}

export function onlySettled<T>(promises: Promise<T>[]): Promise<T[]> {
  return Promise.allSettled(promises).then((results) =>
    results
      .filter(<(K: PromiseSettledResult<T>) => K is PromiseFulfilledResult<T>>((result) => result.status === 'fulfilled'))
      .map((result: PromiseFulfilledResult<T>) => result.value),
  );
}

export function defer(fn: any, timeout: number = 0) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(typeof fn === 'function' ? fn() : fn);
    }, timeout);
  });
}

export function delay(timeout = 0) {
  const start = Date.now();
  return new Promise((resolve) => setTimeout(() => resolve(Date.now() - start), timeout));
}
