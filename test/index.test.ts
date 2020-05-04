import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { start, stop } from './server';

import { getArgs } from './helper';

import Hackium from '../src';

const fsp = fs.promises;

const port = 5000;
let baseUrl = `http://127.0.0.1:${port}/`;
let baseArgs = `--url="${baseUrl}" --pwd="${__dirname}" --headless`;

describe('CLI', function() {
  this.timeout(6000);
  
  before((done) => {
    console.log('starting server');
    start(port, _ => {
      console.log('started server');
      done();
    });
  });

  after((done) => {
    console.log('stopping server');
    stop(_ => {
      console.log('stopped server');
      done();
    });
  });

  it('Should go to a default URL', async () => {
    const instance = new Hackium(getArgs(`${baseArgs}`));
    await instance.cliBehavior();
    const [page] = await instance.browser.pages();
    const title = await page.title();
    assert.equal(title, 'Test page');
    return instance.close();
  });
  it('Should inject evaluateOnNewDocument scripts', async () => {
    const instance = new Hackium(
      getArgs(`${baseArgs} --inject fixtures/global-var.js`),
    );
    await instance.cliBehavior();
    const [page] = await instance.browser.pages();
    const globalValue = await page.evaluate('window.globalVar');
    assert.equal(globalValue, 'globalVar');
    return instance.close();
  });

  it('Should intercept scripts', async () => {
    const instance = new Hackium(
      getArgs(`${baseArgs} --i "*.js" --I fixtures/interceptor.js`),
    );
    await instance.cliBehavior();
    const [page] = await instance.browser.pages();
    const value = await page.evaluate('window.interceptedVal');
    assert.equal(value, 'interceptedValue');
    return instance.close();
  });

  it('Should create userDataDir', async () => {
    const dir = '/tmp/randomDir' + Math.random();
    const instance = new Hackium(
      getArgs(`${baseArgs} --userDataDir=${dir}`),
    );
    await instance.cliBehavior();
    const stat = await fsp.stat(dir);
    assert(stat.isDirectory());
    await fsp.rmdir(dir, {recursive:true});
    return instance.close();
  });

  it('Should watch for changes', async () => {
    const origPath = path.join(__dirname, 'fixtures', 'interceptor.js');
    const tempPath = path.join(__dirname, 'fixtures', 'interceptorTemp.js');
    const origSrc = await fsp.readFile(origPath, 'utf8');

    await fsp.writeFile(tempPath, origSrc.replace('interceptedValue','interceptedValTemp'), 'utf8');
    const instance = new Hackium(
      getArgs(`${baseArgs} --i "*.js" --I fixtures/interceptorTemp.js -w`),
    );
    await instance.cliBehavior();
    const [page] = await instance.browser.pages();
    page.setCacheEnabled(false);

    let value = await page.evaluate('window.interceptedVal');
    assert.equal(value, 'interceptedValTemp');

    await fsp.writeFile(tempPath, origSrc.replace('interceptedValue','interceptedValHotload'), 'utf8');
    await page.reload();

    value = await page.evaluate('window.interceptedVal');
    assert.equal(value, 'interceptedValHotload');

    await fsp.unlink(tempPath);
    return instance.close();
  });
});
