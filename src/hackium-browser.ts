import { Browser, Page } from 'puppeteer';
import Logger from './logger';
import Hackium from '.';

export const { Browser: PuppeteerBrowser } = require('puppeteer/lib/Browser');

declare module 'puppeteer' {
  export interface Page {
    _id: number;
  }
  export interface Browser {
    hackium: HackiumBrowser;
  }
}

// This is hacky but should not be refactored until puppeteer drops with full TS support so we can extend
// "Browser" and other classes properly

export interface HackiumBrowser extends Browser { }

export class HackiumBrowser extends PuppeteerBrowser {
  log: Logger = new Logger('hackium:browser');
  activePage?: Page;

  static async create(browser: Browser): Promise<HackiumBrowser> {
    const props = Object.getOwnPropertyDescriptors(HackiumBrowser.prototype);
    const hackiumBrowser = Object.create(browser, props);
    browser.hackium = hackiumBrowser;
    hackiumBrowser.log = new Logger('hackium:browser');
    return hackiumBrowser;
  }

  async maximize() {
    // hacky way of maximizing. --start-maximized and windowState:maximized don't work on macs. Check later.
    const [page] = await this.pages();
    const [width, height] = (await page.evaluate(
      '[screen.availWidth, screen.availHeight];',
    )) as [number, number];
    return this.setWindowBounds(width, height);
  }

  async setWindowBounds(width: number, height: number) {
    const window = (await this.getConnection().send(
      'Browser.getWindowForTarget',
      {
        // @ts-ignore
        targetId: page._targetId,
      },
    )) as { windowId: number };
    return this.getConnection().send('Browser.setWindowBounds', {
      windowId: window.windowId,
      bounds: { top: 0, left: 0, width, height },
    });
  }

  async setProxy(host: string, port: number) {
    var config = {
      mode: 'fixed_servers',
      rules: {
        singleProxy: {
          scheme: 'http',
          host: host,
          port: port,
        },
        bypassList: [],
      },
    };
    const msg = { value: config, scope: 'regular' };

    this.log.debug(`sending request to change proxy`);
    return this.extension.send(`chrome.proxy.settings.set`, msg);
  }

  async clearProxy() {
    this.log.debug(`sending request to clear proxy`);
    return this.extension.send(`chrome.proxy.settings.clear`, {
      scope: 'regular',
    });
  }

  setActivePage(page: Page) {
    this.log.debug(`setting active page (${page.url()})`);
    this.activePage = page;
  }

  getActivePage() {
    if (!this.activePage) throw new Error('no active page in browser instance');
    return this.activePage;
  }

}
