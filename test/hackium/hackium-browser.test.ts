import { start, TestServer } from '@jsoverson/test-server';
import chai, { expect } from 'chai';
import fs from 'fs';
import { Hackium } from '../../src';
import { getRandomDir } from '../../src/util/file';
import { delay } from '../../src/util/promises';
import spies from 'chai-spies';

chai.use(spies);
const fsp = fs.promises;

describe('Browser', function () {
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
    hackium = new Hackium({ headless: false });
  });

  afterEach(async () => {
    if (hackium) await hackium.close();
  });

  it('should update active page as tabs open', async () => {
    const browser = await hackium.launch();
    const [page] = await browser.pages();
    await page.goto(server.url('index.html'));
    expect(page).to.equal(browser.activePage);
    const page2 = await browser.newPage();
    // delay because of a race condition where goto resolves before we get
    // to communicate that the active page updated. It's significant in automated scripts but not
    // perceptible in manual usage/repl where activePage is most used.
    await delay(1000);
    await page2.goto(server.url('two.html'), { waitUntil: 'networkidle2' });
    expect(page2).to.equal(browser.activePage);
  });

  it('Should return an error when port defined as string', async () => {
    const browser = await hackium.launch();
    const logSpy = chai.spy();
    browser.log.error = logSpy;
    let browserError: any;
    const callSetProxy = (stringPort: any) => browser.setProxy('127.0.0.1', stringPort);
    await callSetProxy('9999').catch((err: Error) => {
      browserError = err;
    });
    expect(browserError).to.be.instanceOf(Error);
    expect(browserError.message).to.contain('port is not a number');
    expect(logSpy).to.have.been.called.once.with('HackiumBrowser.setProxy: port is not a number');
  });
});
