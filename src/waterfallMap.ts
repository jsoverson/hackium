export function waterfallMap<T, J>(
  array: Array<J>,
  iterator: (el: J, i: number) => Promise<T>,
): Promise<Array<T>> {
  const reducer = (
    accumulator: Promise<T[]>,
    next: J,
    i: number,
  ): Promise<T[]> => {
    const a = accumulator.then((result) =>
      iterator(next, i).then((newNode) => result.concat(newNode)),
    );
    return a;
  };

  const waterfall: Promise<Array<T>> = array.reduce(
    reducer,
    Promise.resolve([]),
  );

  return waterfall;
}
