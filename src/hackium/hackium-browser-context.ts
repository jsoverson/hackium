
import { BrowserContext } from 'puppeteer/lib/Browser';
import Logger from '../util/logger';
import { HackiumBrowser } from './hackium-browser';

export class HackiumBrowserContext extends BrowserContext {
  log = new Logger('hackium:browser-context');
  browser(): HackiumBrowser {
    return super.browser() as HackiumBrowser;
  }
}

