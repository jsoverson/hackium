import chai, { expect } from 'chai';
import spies from 'chai-spies';
import findRoot from 'find-root';
import path from 'path';
import { Hackium } from '../../src';
import { HackiumBrowser } from '../../src/hackium/hackium-browser';
import { Plugin } from '../../src/util/types';
import { HackiumPage } from '../../src/hackium/hackium-page';
import { string } from 'yargs';
import Logger from '../../src/util/logger';

chai.use(spies);

describe('Hackium', function () {
  let hackium: Hackium | null = null;
  afterEach(async () => {
    if (hackium) await hackium.close();
  });
  it('Should instantiate with no arguments', async () => {
    hackium = new Hackium();
    expect(hackium).to.be.instanceOf(Hackium);
  });

  it('Should return an error when port defined as string', async () => {

    hackium = new Hackium();
    const browser = await hackium.launch();
    const logSpy = chai.spy();
    browser.log.error = logSpy;
    let browserError: any;
    const callSetProxy = (stringPort: any) => browser.setProxy("127.0.0.1", stringPort)
    await callSetProxy('9999')
      .catch((err: Error) => { browserError = err; })
    expect(browserError).to.be.instanceOf(Error)
    expect(browserError.message).to.contain('port is not a number');
    expect(logSpy).to.have.been.called.once.with('HackiumBrowser.setProxy: port is not a number')
  });

  it('Should use version from package.json', async () => {
    hackium = new Hackium();
    const pkg = require(path.join(findRoot(__dirname), 'package.json'));
    expect(hackium.version).to.equal(pkg.version);
  });

  it('Should execute plugins', async () => {
    let meta: any = {};
    let browser: HackiumBrowser | null = null;
    let plugin: Plugin = {
      preInit: function (_hackium, options) {
        meta.pluginPreInit = true;
        expect(options.devtools).to.equal(false);
        expect(_hackium).to.be.instanceOf(Hackium);
        options.headless = true;
      },
      postInit: function (_hackium, options) {
        meta.pluginPostInit = true;
        expect(options.headless).to.equal(true);
        expect(_hackium).to.be.instanceOf(Hackium);
      },
      preLaunch: function (_hackium, launchOptions) {
        meta.pluginPreLaunch = true;
        expect(launchOptions.headless).to.equal(true);
        launchOptions.headless = false;
        expect(_hackium).to.equal(hackium);
      },
      postLaunch: function (_hackium, _browser, finalLaunchOptions) {
        meta.pluginPostLaunch = true;
        expect(finalLaunchOptions.headless).to.equal(false);
        expect(_hackium).to.equal(hackium);
        expect(_browser).to.be.instanceOf(HackiumBrowser);
      },
      prePageCreate: function (_browser) {
        meta.pluginPrePageCreate = true;
        expect(_browser).to.be.instanceOf(HackiumBrowser);
      },
      postPageCreate: function (_browser, _page) {
        meta.pluginPostPageCreate = true;
        expect(_browser).to.be.instanceOf(HackiumBrowser);
        expect(_page).to.be.instanceOf(HackiumPage);
        //@ts-ignore
        _page.customProp = true;
      },
    };

    expect(meta.pluginPreInit).to.be.undefined;
    expect(meta.pluginPostInit).to.be.undefined;
    hackium = new Hackium({
      headless: false,
      plugins: [plugin],
    });
    expect(meta.pluginPreInit).to.be.true;
    expect(meta.pluginPostInit).to.be.true;
    expect(meta.pluginPreLaunch).to.be.undefined;
    expect(meta.pluginPostLaunch).to.be.undefined;
    browser = await hackium.launch();
    expect(meta.pluginPreLaunch).to.be.true;
    expect(meta.pluginPostLaunch).to.be.true;
    expect(meta.pluginPrePageCreate).to.be.true;
    expect(meta.pluginPostPageCreate).to.be.true;
    const [page] = await browser.pages();
    //@ts-ignore
    expect(page.customProp).to.be.true;
    const page2 = await browser.newPage();
    //@ts-ignore
    expect(page2.customProp).to.be.true;
  });
});
