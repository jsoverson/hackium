import { Browser, CDPSession, Page } from 'puppeteer';

export const { Browser: PuppeteerBrowser } = require('puppeteer/lib/Browser');

export class HackiumBrowser extends PuppeteerBrowser {
  static create(browser: Browser): HackiumBrowser {
    const props = Object.getOwnPropertyDescriptors(HackiumBrowser.prototype);
    const hackiumBrowser = Object.create(browser, props);
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

    return this.extension.send(`chrome.proxy.settings.set`, msg);
  }

  async clearProxy() {
    return this.extension.send(`chrome.proxy.settings.clear`, {
      scope: 'regular',
    });
  }

  // async getActivePage(): Promise<Page | null> {
  //   const visibilityChecks = (await this.pages()).map((p: Page) =>
  //     p.evaluate(`document.visibilityState]`).then((res) => [p, res]),
  //   );
  //   const results = await Promise.allSettled(visibilityChecks);
  //   for (let result of results) {
  //     if (result.status === 'fulfilled') {
  //       const page = result.value[0] as Page;
  //       return page;
  //     }
  //   }
  //   return null;
  // }
}
