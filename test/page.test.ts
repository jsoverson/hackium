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

  xit('Should update active page as tabs open', async () => {
    console.log('\n\n\na\n\n\n\n');
    const [page] = await browser.pages();
    console.log('\n\n\nb\n\n\n\n');
    await page.goto(baseUrl);
    console.log('\n\n\nc\n\n\n\n');
    const page2 = await browser.newPage();
    console.log('\n\n\nd\n\n\n\n');
    await page2.goto(`${baseUrl}two.html`);
    await page2.setCacheEnabled(false);
    console.log('\n\n\ne\n\n\n\n');
    const activePage = await browser.getActivePage();
    console.log('\n\n\nf\n\n\n\n');
    const messages = await page2.evaluate('messages') as any[];
    expect(messages.length).to.equal(1);
    expect(messages[0].owner).to.equal('hackium');
    expect(page2).to.equal(activePage);
  });

  it('Should expose hackium object & version on the page', async () => {
    const [page] = await browser.pages();
    await page.goto(baseUrl);
    const version = await page.evaluate('hackium.version');
    expect(version).to.equal(require('../package.json').version);
  });

});
