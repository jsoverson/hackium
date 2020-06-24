export function waterfallMap<T, J>(
  array: J[],
  iterator: (el: J, i: number) => Promise<T>,
): Promise<T[]> {
  const reducer = (
    accumulator: Promise<T[]>,
    next: J,
    i: number,
  ): Promise<T[]> => {
    return accumulator.then((result) =>
      iterator(next, i).then((newNode) => result.concat(newNode)),
    );
  };

  return array.reduce(
    reducer,
    Promise.resolve([]),
  );
}

export function onlySettled<T>(promises: Promise<T>[]): Promise<T[]> {
  return Promise.allSettled(promises)
    .then(results => results
      .filter(<(K: PromiseSettledResult<T>) => K is PromiseFulfilledResult<T>>(result => result.status === 'fulfilled'))
      .map((result: PromiseFulfilledResult<T>) => result.value))
}