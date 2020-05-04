import assert from 'assert';
import {promises as fs} from 'fs';
import path from 'path';

import { start, stop } from './server';

import { getArgs } from './helper';

import Hackium from '../src';

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
    assert.equal(value, 'interceptedVal');
    return instance.close();
  });

  it('Should watch for changes', async () => {
    const tempPath = path.join(__dirname, 'fixtures', 'interceptorTemp.js');
    const tempSrc = await fs.readFile(tempPath, 'utf8');
    
    await fs.writeFile(tempPath, tempSrc, 'utf8');
    const instance = new Hackium(
      getArgs(`${baseArgs} --i "*.js" --I fixtures/interceptorTemp.js -w`),
    );
    await instance.cliBehavior();
    const [page] = await instance.browser.pages();
    page.setCacheEnabled(false);

    let value = await page.evaluate('window.interceptedVal');
    assert.equal(value, 'interceptedValTemp');

    await fs.writeFile(tempPath, tempSrc.replace('interceptedValTemp','interceptedValHotload'), 'utf8');
    await page.reload();

    value = await page.evaluate('window.interceptedVal');
    assert.equal(value, 'interceptedValHotload');

    await fs.unlink(tempPath);
    return instance.close();
  });
});
