import { start, TestServer } from '@jsoverson/test-server';
import chai, { expect } from 'chai';
import { Hackium } from '../../src';
import { HackiumBrowser } from '../../src/hackium/hackium-browser';
import spies from 'chai-spies';

chai.use(spies);
describe('Input', function () {
  describe('Mouse', function () {
    this.timeout(10000);
    let hackium: Hackium, browser: HackiumBrowser;
    let server: TestServer;
    before(async () => {
      server = await start(__dirname, '..', '_server_root');
    });

    after(async () => {
      await server.stop();
    });
    afterEach(async () => {
      if (hackium) await hackium.close();
    });
    it('coordinates should be randomized at mouse instantiation', async () => {
      hackium = new Hackium({ headless: true });
      const browser = await hackium.launch();
      const [page] = await browser.pages();
      expect(page.mouse.x).to.be.not.undefined;
      expect(page.mouse.x).to.be.greaterThan(0);
      expect(page.mouse.y).to.be.not.undefined;
      expect(page.mouse.y).to.be.greaterThan(0);
    });

    it('click() should give a friendly error when passing incorrect types', async () => {
      hackium = new Hackium({ headless: true });
      const browser = await hackium.launch();
      const [page] = await browser.pages();
      const logSpy = chai.spy();
      page.mouse.log.error = logSpy;
      let error: any;
      await page.mouse.click('100' as any, '100' as any).catch((e) => (error = e));
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.contain('x & y must be numbers');
      expect(logSpy).to.have.been.called.once;
    });

    it('.moveTo should move to an element & click should click where we are at', async () => {
      hackium = new Hackium({ headless: true });
      const browser = await hackium.launch();
      const [page] = await browser.pages();
      await page.goto(server.url('form.html'));
      await page.mouse.moveTo('button');
      await page.mouse.click();
      await page.mouse.click();
      await page.mouse.click();
      const numClicks = await page.evaluate('buttonClicks');
      expect(numClicks).to.equal(3);
    });
    it('.idle should reset basic idle timer', async () => {
      hackium = new Hackium({ headless: true });
      const browser = await hackium.launch();
      const [page] = await browser.pages();
      await page.goto(server.url('idle.html'));
      await page.mouse.idle();
      const { idleTime, totalTime } = (await page.evaluate('({idleTime, totalTime})')) as { idleTime: number; totalTime: number };
      expect(totalTime).to.be.greaterThan(0);
      expect(idleTime).to.be.greaterThan(0);
      expect(idleTime).to.be.lessThan(totalTime);
    });
  });
  describe('Keyboard', function () {
    this.timeout(10000);
    let hackium: Hackium, browser: HackiumBrowser;
    let server: TestServer;
    before(async () => {
      server = await start(__dirname, '..', '_server_root');
    });

    after(async () => {
      await server.stop();
    });
    afterEach(async () => {
      if (hackium) await hackium.close();
    });

    it('.idle should reset basic idle timer', async () => {
      hackium = new Hackium({ headless: true });
      const browser = await hackium.launch();
      const [page] = await browser.pages();
      await page.goto(server.url('idle.html'));
      await page.keyboard.idle();
      const { idleTime, totalTime } = (await page.evaluate('({idleTime, totalTime})')) as { idleTime: number; totalTime: number };
      expect(totalTime).to.be.greaterThan(0);
      expect(idleTime).to.be.greaterThan(0);
      expect(idleTime).to.be.lessThan(totalTime);
    });
  });
});
