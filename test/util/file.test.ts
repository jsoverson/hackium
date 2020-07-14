import { resolve } from '../../src/util/file';
import { expect } from 'chai';

describe('file', function () {
  it('.resolve() should resolve relative paths with passed pwd', async () => {
    const path = resolve(['.', 'foo', 'bar.js'], '/a');
    expect(path).to.equal('/a/foo/bar.js');
  });
  it('.resolve() should resolve absolute paths regardless of pwd', async () => {
    const path = resolve(['/foo/bar/baz.js'], '/a');
    expect(path).to.equal('/foo/bar/baz.js');
  });
});
