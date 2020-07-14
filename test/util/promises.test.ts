import { onlySettled, defer, delay } from '../../src/util/promises';
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
});
