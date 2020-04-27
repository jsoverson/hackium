import assert from 'assert';

import { getArgs } from './helper';
// import { start, stop } from './server';

import Hackium from '../src';

const port = 5000;
let baseUrl = `http://127.0.0.1:${port}/`;
let baseArgs = `--url="${baseUrl}" --pwd="${__dirname}" --headless`

describe('CLI', () => {
  it('Should go to a default URL', async () => {
    const instance = new Hackium(getArgs(`${baseArgs}`));
    await instance.cliBehavior();
    const [ page ] = await instance.browser.pages();
    const title = await page.title();
    assert.equal(title, 'Test page');
    return instance.close();
  });
  it('Should inject evaluateOnNewDocument scripts', async () => {
    const instance = new Hackium(getArgs(`${baseArgs} --inject fixtures/global-var.js`));
    await instance.cliBehavior();
    const [ page ] = await instance.browser.pages();
    const globalValue = await page.evaluate('window.globalVar');
    assert.equal(globalValue, 'globalVar');
    return instance.close();
  });

  it('Should intercept scripts', async () => {
    const instance = new Hackium(getArgs(`${baseArgs} --i "*.js" --I fixtures/interceptor.js`));
    await instance.cliBehavior();
    const [ page ] = await instance.browser.pages();
    const value = await page.evaluate('window.interceptedVal');
    assert.equal(value, 'interceptedVal');
    return instance.close();
  });
});

