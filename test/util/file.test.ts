import { resolve, watch, remove, write, read } from '../../src/util/file';
import { expect } from 'chai';
import { debug } from '../helper';
import { defer, delay } from '../../src/util/promises';
import path from 'path';

describe('file', function () {
  it('.resolve() should resolve relative paths with passed pwd', async () => {
    const fullPath = resolve(['.', 'foo', 'bar.js'], '/a');
    expect(fullPath).to.equal(path.resolve('/a/foo/bar.js'));
  });
  it('.resolve() should resolve absolute paths regardless of pwd', async () => {
    const fullPath = resolve(['/foo/bar/baz.js'], '/a');
    expect(fullPath).to.equal(path.resolve('/foo/bar/baz.js'));
  });
  it('.read() reads a file', async () => {
    const fullPath = resolve(['..', '_fixtures', 'dummy.txt'], __dirname);
    const contents = 'dummy contents';
    await write(fullPath, contents);
    const readContents = await read(fullPath);
    expect(readContents).to.equal(contents);
    await remove(fullPath);
  });
  it('.read() should take in file parts like resolve()', async () => {
    const fullPath = resolve(['..', '_fixtures', 'dummy.txt'], __dirname);
    const contents = 'dummy contents';
    await write(fullPath, contents);
    const readContents = await read(['..', '_fixtures', 'dummy.txt'], __dirname);
    expect(readContents).to.equal(contents);
    await remove(fullPath);
  });
  it('.watch() files and calls a callback on change', async () => {
    const fullPath = resolve(['..', '_fixtures', 'dummy.txt'], __dirname);
    const contents = 'dummy contents';
    await write(fullPath, contents);
    const promise = new Promise((resolve, reject) => watch(fullPath, resolve));
    await delay(100);
    await write(fullPath, contents + contents);
    return promise.finally(() => remove(fullPath));
  });
});
