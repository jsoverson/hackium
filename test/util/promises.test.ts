import { onlySettled, defer, delay, waterfallMap } from '../../src/util/promises';
import { expect } from 'chai';

describe('Promises', function () {
  it('onlySettled() should act like allSettled + filtering out rejections', async () => {
    const results = await onlySettled([Promise.resolve(1), Promise.reject(2), Promise.resolve(3)]);
    expect(results).to.deep.equal([1, 3]);
  });
  it('defer() should yield value after timeout', async () => {
    const value = await defer(() => 2, 100);
    expect(value).to.equal(2);
  });
  it('defer() should take non-function as input', async () => {
    const value = await defer(22, 100);
    expect(value).to.equal(22);
  });
  it('delay() should resolve after the passed timeout', async () => {
    const value = await delay(100);
    expect(value).to.be.greaterThan(99);
  });
  it('waterfallMap() should run a series of promises in order', async function () {
    const array = ['something', 1, { other: 'this' }];

    const arrayIndex: any[] = [];

    function promiseGenerator(el: any, i: number) {
      return new Promise((res, rej) => {
        setTimeout(() => res(el), Math.random() * 200);
      });
    }
    function promiseGeneratorIndex(el: any, i: number) {
      return new Promise<void>((res, rej) => {
        setTimeout(() => {
          arrayIndex[i] = el;
          res();
        }, Math.random() * 200);
      });
    }
    const newArray = await waterfallMap(array, promiseGenerator);
    expect(newArray).to.deep.equal(array);
    await waterfallMap(array, promiseGeneratorIndex);
    expect(arrayIndex).to.deep.equal(array);
    expect(arrayIndex).to.deep.equal(newArray);
  });
  it('waterfallMap() should tolerate non-promise values', async function () {
    const array = ['something', 1, { other: 'this' }];

    const newArray = await waterfallMap(array, (x) => x);
    expect(newArray).to.deep.equal(array);
  });
});
