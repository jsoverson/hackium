import { expect } from 'chai';
import fs from 'fs';

import { start, stop } from './server';

import Hackium from '../src';
import { HackiumBrowser } from '../src/hackium-browser';

const fsp = fs.promises;

const port = 5000;
let baseUrl = `http://127.0.0.1:${port}/`;

describe('Page', function () {
  this.timeout(60000);
  let userDataDir = '/nonexistant';
  let hackium: Hackium;
  let browser: HackiumBrowser;

  before((done) => {
    userDataDir = '/tmp/randomDir' + Math.random();
    start(port, (_) => {
      hackium = new Hackium();
      hackium.launch().then(b => {
        browser = b;
        done();
      })
    });
  });

  after((done) => {
    console.log('closing hackium...');
    hackium.close().then(() => {
      console.log('...closed hackium');
      console.log('removing userdatadir...');
      fsp.rmdir(userDataDir, { recursive: true }).then(() => {
        console.log('...removed userdatadir');
        stop((_) => {
          hackium.close().then(done);
        });
      });
    })
  });

  it('Should update active page as tabs open', async () => {
    const [page] = await browser.pages();
    await page.goto(baseUrl);
    expect(page).to.equal(browser.activePage);
    const page2 = await browser.newPage();
    // waitUntil: 'networkidle2' because of a race condition where goto resolves before we get 
    // to communicate that the active page updated. It's significant in automated scripts but not 
    // perceptible in manual usage/repl where activePage is most used.
    await page2.goto(`${baseUrl}two.html`, { waitUntil: 'networkidle2' });
    expect(page2).to.equal(browser.activePage);
  });

  it('Should expose hackium object & version on the page', async () => {
    const [page] = await browser.pages();
    await page.goto(baseUrl);
    const version = await page.evaluate('hackium.version');
    expect(version).to.equal(require('../package.json').version);
  });

});
