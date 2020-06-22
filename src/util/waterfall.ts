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

// export function waterfall<T>(promises: Promise<T>[]): Promise<T[]> {

//   const reducer = (
//     accumulator: Promise<T[]>,
//     next: Promise<T>,
//     i: number,
//   ): Promise<T[]> => accumulator.then(list => next.then(val => list.concat(val)));

//   return promises.reduce(
//     reducer,
//     Promise.resolve([]),
//   );
// }
