import assert from 'assert';

import Lib from '../src';

describe('API', () => {
  it('Should expose its API', () => {
    const lib = new Lib({
      file: ''
    });
    assert(lib);
  });
});
