import { expect } from 'chai';
import { merge } from '../../src/util/object';

describe('object', function () {
  it('.merge() should take arbitrary other objects', async () => {
    const other1 = {
      a: 1,
      b: 'not this',
    };
    const other2 = {
      b: 2,
    };
    const final = merge({}, other1, other2);
    const expected = {
      a: 1,
      b: 2,
    };
    expect(final).to.deep.equal(expected);
  });
  it('.merge() should not mutate objects', async () => {
    const dest = {
      a: 1,
    };
    const other = {
      b: 2,
    };
    const final = merge(dest, other);
    const expected = {
      a: 1,
      b: 2,
    };
    expect(final).to.deep.equal(expected);
    expect(final).to.not.equal(dest);
    expect('b' in dest).to.be.false;
    expect('a' in other).to.be.false;
  });
  it('.merge() should merge objects', async () => {
    const dest = {
      undef1: undefined,
      undef2: undefined,
      defined1: 'defined',
      defined2: 'defined',
      array1: ['array1'],
      array2: [],
    };
    const other = {
      undef1: 'defined',
      defined1: 'redefined',
      defined3: 'defined',
      array1: ['otherArray1'],
      array2: ['otherArray2'],
      array3: ['otherArray3'],
    };
    const mutatedDest = merge(dest, other);
    const expected = {
      undef1: 'defined',
      undef2: undefined,
      defined1: 'redefined',
      defined2: 'defined',
      defined3: 'defined',
      array1: ['array1', 'otherArray1'],
      array2: ['otherArray2'],
      array3: ['otherArray3'],
    };
    expect(mutatedDest).to.deep.equal(expected);
  });
});
