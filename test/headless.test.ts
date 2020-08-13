import { expect } from 'chai';
import { Hackium } from '../src';
import { HackiumBrowser } from '../src/hackium/hackium-browser';

describe('headless', function () {
  let hackium: Hackium | null = null;

  afterEach(async () => {
    if (hackium) await hackium.close();
  });

  it('Should launch headlessly', async () => {
    hackium = new Hackium({
      headless: true,
    });
    const browser = await hackium.launch();
    expect(browser).to.be.instanceOf(HackiumBrowser);
  });
});
