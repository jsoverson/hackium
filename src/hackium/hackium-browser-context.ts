import { BrowserContext, Browser } from 'puppeteer/lib/cjs/common/Browser';
import Logger from '../util/logger';
import { HackiumBrowser } from './hackium-browser';
import { Connection } from 'puppeteer/lib/cjs/common/Connection';
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
    console.log('mine');
    const targets = this.targets();
    const targetsThatArePages = targets.filter((target) => target.type() === 'page');
    const promisesOfPages = targetsThatArePages.map((target) => target.page() as Promise<HackiumPage>);
    const pages = await Promise.all(promisesOfPages);

    // const pages = await Promise.all(
    //   this.targets()
    //     .filter((target) => target.type() === 'page')
    //     .map((target) => target.page() as Promise<HackiumPage>),
    // );
    return pages.filter((page) => !!page);
  }
}
