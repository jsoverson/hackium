
import { onlySettled } from '../src/util/promises';
import { expect } from 'chai';

describe('Promises', function () {

  it('onlySettled() should act like allSettled + filtering out rejections', async () => {
    const results = await onlySettled([
      Promise.resolve(1),
      Promise.reject(2),
      Promise.resolve(3)
    ])
    expect(results).to.deep.equal([1, 3]);
  });
});
