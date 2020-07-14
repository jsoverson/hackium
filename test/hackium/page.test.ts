import { expect } from 'chai';
import { Debugger } from 'debug';
import fs from 'fs';
import { Interceptor } from 'puppeteer-interceptor';
import Protocol from 'puppeteer/lib/protocol';
import Hackium from '../../src';
import { HackiumBrowser } from '../../src/hackium/hackium-browser';
import { start, TestServer } from '@jsoverson/test-server';
import path from 'path';

const fsp = fs.promises;

describe('Page', function () {
  this.timeout(6000);
  let userDataDir = '/nonexistant';
  let hackium: Hackium;
  let server: TestServer;

  before(async () => {
    userDataDir = '/tmp/randomDir' + Math.random();
    server = await start(__dirname, '..', '_server_root');
  });

  after(async () => {
    await fsp.rmdir(userDataDir, { recursive: true });
    await server.stop();
  });

  beforeEach(async () => {
    hackium = new Hackium();
  });

  afterEach(async () => {
    if (hackium) await hackium.close();
  });

  it('Should update active page as tabs open', async () => {
    const browser = await hackium.launch();
    const [page] = await browser.pages();
    await page.goto(server.url('index.html'));
    expect(page).to.equal(browser.activePage);
    const page2 = await browser.newPage();
    // waitUntil: 'networkidle2' because of a race condition where goto resolves before we get
    // to communicate that the active page updated. It's significant in automated scripts but not
    // perceptible in manual usage/repl where activePage is most used.
    await page2.goto(server.url('two.html'), { waitUntil: 'networkidle2' });
    expect(page2).to.equal(browser.activePage);
  });

  it('Should expose hackium object & version on the page', async () => {
    const browser = await hackium.launch();
    const [page] = await browser.pages();
    await page.goto(server.url('index.html'));
    const version = await page.evaluate('hackium.version');
    expect(version).to.equal(require('../../package.json').version);
  });

  it('Should always inject new scripts after hackium client', async () => {
    hackium = new Hackium({
      inject: [path.join(__dirname, '..', '_fixtures', 'injection.js')],
    });
    const browser = await hackium.launch();
    const [page] = await browser.pages();
    await page.goto(server.url('index.html'));
    const bool = await page.evaluate('hackiumExists');
    expect(bool).to.be.true;
  });

  it('Should allow configurable interception', async () => {
    const browser = await hackium.launch();
    const [page] = await browser.pages();
    let runs = 0;
    page.addInterceptor({
      intercept: [
        {
          urlPattern: '*console*',
          resourceType: 'Script',
          requestStage: 'Response',
        },
      ],
      interceptor: function (
        browser: HackiumBrowser,
        interception: { request: Protocol.Network.Request; response: Interceptor.InterceptedResponse },
        debug: Debugger,
      ) {
        runs++;
        if (!interception.response.body) throw new Error('no body');
        interception.response.body = 'var myNewValue = 12;';
        return interception.response;
      },
    });
    await page.goto(server.url('index.html'));
    const value = await page.evaluate('myNewValue');
    expect(runs).to.equal(1);
    expect(value).to.equal(12);
  });
});
