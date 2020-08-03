import { expect } from 'chai';
import findRoot from 'find-root';
import path from 'path';
import { Hackium } from '../../src';
import { HackiumBrowser } from '../../src/hackium/hackium-browser';
import { Plugin } from '../../src/util/types';

describe('Hackium', function () {
  let hackium: Hackium | null = null;
  afterEach(async () => {
    if (hackium) await hackium.close();
  });
  it('Should insantiate with no arguments', async () => {
    hackium = new Hackium();
    expect(hackium).to.be.instanceOf(Hackium);
  });

  it('Should propagate version', async () => {
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
        options.devtools = true;
      },
      postInit: function (_hackium, options) {
        meta.pluginPostInit = true;
        expect(options.devtools).to.equal(true);
        expect(_hackium).to.be.instanceOf(Hackium);
      },
      preLaunch: function (_hackium, launchOptions) {
        meta.pluginPreLaunch = true;
        expect(launchOptions.devtools).to.equal(true);
        launchOptions.devtools = false;
        expect(_hackium).to.equal(hackium);
      },
      postLaunch: function (_hackium, _browser, finalLaunchOptions) {
        meta.pluginPostLaunch = true;
        expect(finalLaunchOptions.devtools).to.equal(false);
        console.log();
        expect(_hackium).to.equal(hackium);
        expect(_browser).to.be.instanceOf(HackiumBrowser);
      },
    };

    expect(meta.pluginPreInit).to.be.undefined;
    expect(meta.pluginPostInit).to.be.undefined;
    hackium = new Hackium({
      devtools: false,
      plugins: [plugin],
    });
    expect(meta.pluginPreInit).to.be.true;
    expect(meta.pluginPostInit).to.be.true;
    expect(meta.pluginPreLaunch).to.be.undefined;
    expect(meta.pluginPostLaunch).to.be.undefined;
    browser = await hackium.launch();
    expect(meta.pluginPreLaunch).to.be.true;
    expect(meta.pluginPostLaunch).to.be.true;
  });
});
