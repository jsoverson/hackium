import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import Hackium from '../src';
import { Arguments } from '../src/arguments';
import { getArgs } from './helper';
import { start, stop } from './server';

const fsp = fs.promises;

const port = 5000;
let baseUrl = `http://127.0.0.1:${port}/`;

describe('CLI', function () {
  this.timeout(60000);
  let dir = '/nonexistant';
  let baseArgs = '';
  let instance: Hackium | undefined;

  before((done) => {
    dir = '/tmp/randomDir' + Math.random();
    baseArgs = `--url="${baseUrl}" --pwd="${__dirname}" --userDataDir=${dir}`;

    console.log('starting server');
    start(port, (_) => {
      console.log('started server');
      done();
    });
  });

  after((done) => {
    console.log('stopping server');
    fsp.rmdir(dir, { recursive: true }).then(() => {
      stop((_) => {
        console.log('stopped server');
        done();
      });
    });
  });

  afterEach(async () => {
    console.log('cleaning up');
    if (instance) {
      instance.cleanup();
      return instance.close();
    }
  })

  it('Should go to a default URL', async () => {
    instance = new Hackium(getArgs(`${baseArgs}`));
    const browser = await instance.cliBehavior();
    const [page] = await browser.pages();
    const title = await page.title();
    expect(title).to.equal('Test page');
  });

  it('Should inject evaluateOnNewDocument scripts', async () => {
    instance = new Hackium(
      getArgs(`${baseArgs} --inject fixtures/global-var.js`),
    );
    const browser = await instance.cliBehavior();
    const [page] = await browser.pages();
    const globalValue = await page.evaluate('window.globalVar');
    expect(globalValue).to.equal('globalVar');
  });

  it('Should intercept scripts', async () => {
    instance = new Hackium(
      getArgs(`${baseArgs} --i fixtures/interceptor.js`),
    );
    const browser = await instance.cliBehavior();
    const [page] = await browser.pages();
    const value = await page.evaluate('window.interceptedVal');
    expect(value).to.equal('interceptedValue');
  });

  it('Should create userDataDir', async () => {
    instance = new Hackium(getArgs(`${baseArgs}`));
    await instance.cliBehavior();
    const stat = await fsp.stat(dir);
    expect(stat.isDirectory()).to.be.true;
  });

  it('Should read local config', async () => {
    instance = new Hackium({
      pwd: __dirname,
      // headless: true,
      url: `${baseUrl}/anything`,
    } as Arguments);
    const browser = await instance.cliBehavior();
    const [page] = await browser.pages();
    const url = page.url();
    expect(url).to.equal(`${baseUrl}/anything`);
  });

  it('Should merge defaults with passed config', async () => {
    instance = new Hackium({
      headless: false,
      userDataDir: dir,
    } as Arguments);
    expect(instance.config.pwd).equal(process.cwd());
  });

  it('Should watch for and apply changes on a reload', async () => {
    const origPath = path.join(__dirname, 'fixtures', 'interceptor.js');
    const tempPath = path.join(__dirname, 'fixtures', 'interceptorTemp.js');
    const origSrc = await fsp.readFile(origPath, 'utf8');

    await fsp.writeFile(
      tempPath,
      origSrc.replace('interceptedValue', 'interceptedValTemp'),
      'utf8',
    );
    instance = new Hackium(
      getArgs(`${baseArgs} --i fixtures/interceptorTemp.js -w`),
    );
    const browser = await instance.cliBehavior();
    let [page] = await browser.pages();

    page.setCacheEnabled(false);

    let value = await page.evaluate('window.interceptedVal');
    expect(value).to.equal('interceptedValTemp');

    await fsp.writeFile(
      tempPath,
      origSrc.replace('interceptedValue', 'interceptedValHotload'),
      'utf8',
    );
    await page.reload();

    value = await page.evaluate('window.interceptedVal');
    expect(value).to.equal('interceptedValHotload');

    await fsp.unlink(tempPath);
  });

  it('Should watch for and apply changes on a new tab', async () => {
    const origPath = path.join(__dirname, 'fixtures', 'interceptor.js');
    const tempPath = path.join(__dirname, 'fixtures', 'interceptorTemp.js');
    const origSrc = await fsp.readFile(origPath, 'utf8');

    await fsp.writeFile(
      tempPath,
      origSrc.replace('interceptedValue', 'interceptedValTemp'),
      'utf8',
    );
    instance = new Hackium(
      getArgs(`${baseArgs} --i fixtures/interceptorTemp.js -w`),
    );
    const browser = await instance.cliBehavior();
    let [page] = await browser.pages();

    page.setCacheEnabled(false);

    let value = await page.evaluate('window.interceptedVal');
    expect(value).equal('interceptedValTemp');

    await fsp.writeFile(
      tempPath,
      origSrc.replace('interceptedValue', 'interceptedValHotload'),
      'utf8',
    );
    await page.close();
    page = await instance.getBrowser().newPage();
    await page.goto(baseUrl);

    value = await page.evaluate('window.interceptedVal');
    expect(value).to.equal('interceptedValHotload');

    await fsp.unlink(tempPath);
  });

  it('Should run hackium scripts', async () => {
    const scriptPath = path.join(__dirname, 'fixtures', 'script.js');

    instance = new Hackium(
      getArgs(`${baseArgs} -e ${scriptPath} -- ${baseUrl}two.html`),
    );
    const browser = await instance.cliBehavior();
    const [pageOrig, pageNew] = await browser.pages();

    const clicksEl = await pageOrig.$('#clicks');
    const numClicks = await pageOrig.evaluate(
      (clicksEl: HTMLElement) => clicksEl.innerHTML,
      clicksEl,
    );

    expect(numClicks).to.equal('2');

    const url = pageNew.url();
    expect(url).to.match(/two/);

    const bodyEl = await pageNew.$('body');
    const body = await pageNew.evaluate((bodyEl: HTMLElement) => bodyEl.innerHTML, bodyEl);
    expect(body).to.equal(require('./fixtures/module'));
  });

});
