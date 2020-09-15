import { expect } from 'chai';
import { Hackium } from '../src';
import { HackiumBrowser } from '../src/hackium/hackium-browser';

describe('upstream', function () {
  let hackium: Hackium | null = null;

  afterEach(async () => {
    if (hackium) await hackium.close();
  });

  // Don't need to run these. TypeScript will check types on compilation.
  xdescribe('types', async function () {
    let browser: HackiumBrowser;
    beforeEach(async () => {
      hackium = new Hackium();
      browser = await hackium.launch();
    });
    afterEach(async () => {
      await browser.close();
    });
    it('page.goto should not need options', async () => {
      const [page] = await browser.pages();
      await page.goto('http://example.com');
    });
  });
});
