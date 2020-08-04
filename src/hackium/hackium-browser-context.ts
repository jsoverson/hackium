import { BrowserContext } from 'puppeteer/lib/cjs/puppeteer/common/Browser';
import { Connection } from 'puppeteer/lib/cjs/puppeteer/common/Connection';
import Logger from '../util/logger';
import { HackiumBrowser } from './hackium-browser';
import { HackiumPage } from './hackium-page';

export class HackiumBrowserContext extends BrowserContext {
  log = new Logger('hackium:browser-context');
  __id?: string;
  __browser: HackiumBrowser;
  constructor(connection: Connection, browser: HackiumBrowser, contextId?: string) {
    super(connection, browser, contextId);
    this.__id = contextId;
    this.__browser = browser;
  }
  get id() {
    return this.__id;
  }
  browser(): HackiumBrowser {
    return super.browser() as HackiumBrowser;
  }
  newPage(): Promise<HackiumPage> {
    return this.__browser._createPageInContext(this.id) as Promise<HackiumPage>;
  }
  async pages(): Promise<HackiumPage[]> {
    const pages = await Promise.all(
      this.targets()
        .filter((target) => target.type() === 'page')
        .map((target) => target.page() as Promise<HackiumPage>),
    );
    return pages.filter((page) => !!page);
  }
}
