import { expect } from 'chai';
import { Debugger } from 'debug';
import fs from 'fs';
import { Interceptor } from 'puppeteer-interceptor';
import Protocol from 'devtools-protocol';
import { Hackium } from '../../src';
import { HackiumBrowser } from '../../src/hackium/hackium-browser';
import { start, TestServer } from '@jsoverson/test-server';
import path from 'path';
import { getRandomDir } from '../../src/util/file';
import { delay } from '../../src/util/promises';
import { CDPSession } from 'puppeteer/lib/cjs/puppeteer/common/Connection';

const fsp = fs.promises;

describe('Page', function () {
  this.timeout(6000);
  let userDataDir = '/nonexistant';
  let hackium: Hackium;
  let server: TestServer;

  before(async () => {
    userDataDir = await getRandomDir();
    server = await start(__dirname, '..', '_server_root');
  });

  after(async () => {
    await fsp.rmdir(userDataDir, { recursive: true });
    await server.stop();
  });

  beforeEach(async () => {
    hackium = new Hackium({ headless: true });
  });

  afterEach(async () => {
    if (hackium) await hackium.close();
  });

  it('should expose a CDP session', async () => {
    const browser = await hackium.launch();
    const [page] = await browser.pages();
    expect(page.connection).to.be.instanceOf(CDPSession);
  });

  // TODO: fix this test
  it("should bypass puppeteer's smart caching if forceCacheEnabled(true)", async () => {
    const cachedUrl = server.url('cached');
    const browser = await hackium.launch();
    const [page] = await browser.pages();
    const go = async () => page.goto(cachedUrl).then((resp) => page.content());
    const resultA1 = await go();
    const resultA2 = await go();
    expect(resultA1).to.equal(resultA2);

    await page.setRequestInterception(true);
    let i = 0;
    page.on('request', (interceptedRequest) => ++i && interceptedRequest.continue());

    const resultB1 = await go(); // should be cached, but cache was disabled by setRequestInterception()
    expect(resultB1).to.not.equal(resultA1);
    expect(i).to.equal(1);

    await page.forceCacheEnabled(true);
    const resultC1 = await go(); // need to visit page again to cache response
    expect(i).to.equal(2);
    const resultC2 = await go();
    expect(i).to.equal(3);
    expect(resultC1).to.equal(resultC2);
    expect(resultC1).to.equal(resultB1);
    expect(resultC2).to.equal(resultB1);
  });

  it('should expose hackium object & version on the page', async () => {
    const browser = await hackium.launch();
    const [page] = await browser.pages();
    await page.goto(server.url('index.html'));
    const version = await page.evaluate('hackium.version');
    expect(version).to.equal(require('../../package.json').version);
  });

  it('should always inject new scripts after hackium client', async () => {
    hackium = new Hackium({
      headless: true,
      inject: [path.join(__dirname, '..', '_fixtures', 'injection.js')],
    });
    const browser = await hackium.launch();
    const [page] = await browser.pages();
    await page.goto(server.url('index.html'));
    const bool = await page.evaluate('hackiumExists');
    expect(bool).to.be.true;
  });

  it('should allow configurable interception', async () => {
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
