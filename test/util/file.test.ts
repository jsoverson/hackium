import { resolve, watch, remove, write, read } from '../../src/util/file';
import { expect } from 'chai';
import { debug } from '../helper';
import { defer, delay } from '../../src/util/promises';

describe('file', function () {
  it('.resolve() should resolve relative paths with passed pwd', async () => {
    const path = resolve(['.', 'foo', 'bar.js'], '/a');
    expect(path).to.equal('/a/foo/bar.js');
  });
  it('.resolve() should resolve absolute paths regardless of pwd', async () => {
    const path = resolve(['/foo/bar/baz.js'], '/a');
    expect(path).to.equal('/foo/bar/baz.js');
  });
  it('.read() reads a file', async () => {
    const path = resolve(['..', '_fixtures', 'dummy.txt'], __dirname);
    const contents = 'dummy contents';
    await write(path, contents);
    const readContents = await read(path);
    expect(readContents).to.equal(contents);
    await remove(path);
  });
  it('.read() should take in file parts like resolve()', async () => {
    const path = resolve(['..', '_fixtures', 'dummy.txt'], __dirname);
    const contents = 'dummy contents';
    await write(path, contents);
    const readContents = await read(['..', '_fixtures', 'dummy.txt'], __dirname);
    expect(readContents).to.equal(contents);
    await remove(path);
  });
  it('.watch() files and calls a callback on change', async () => {
    const path = resolve(['..', '_fixtures', 'dummy.txt'], __dirname);
    const contents = 'dummy contents';
    await write(path, contents);
    const promise = new Promise((resolve, reject) => watch(path, resolve));
    await delay(100);
    await write(path, contents + contents);
    return promise.finally(() => remove(path));
  });
});
