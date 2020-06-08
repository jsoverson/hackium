import DEBUG, { Debugger } from 'debug';
import { promises as fs } from 'fs';
import importFresh from 'import-fresh';
import path from 'path';
import { Browser, LaunchOptions, Page } from 'puppeteer';
import { Interceptor } from 'puppeteer-interceptor';
import { patterns } from '..';
import { Arguments, ArgumentsWithDefaults } from '../arguments';
import { HackiumBrowser } from '../hackium-browser';
import { HackiumPlugin } from './hackium-plugin-base';

declare module 'puppeteer' {
  export interface Browser {
    connection: CDPSession;
  }
}

type InterceptorSignature = (
  hackium: HackiumBrowser,
  evt: Interceptor.OnResponseReceivedEvent,
  debug: Debugger,
) => any;

// This should get less ugly once puppeteer is distributed typescript

export class HackiumBrowserBase extends HackiumPlugin {
  protected config: ArgumentsWithDefaults;
  private interceptors: InterceptorSignature[] = [];
  private interceptorModules: string[] = [];
  private cachedInjections: string[] = [];

  browser?: HackiumBrowser;

  constructor(config: ArgumentsWithDefaults) {
    super(config);
    this.config = config;
    this.debug('browser-base initialized');
  }

  get name() {
    return 'hackium:plugin:browser-base';
  }

  async beforeLaunch(options: LaunchOptions) { }

  async afterLaunch(browser: Browser) {
    const [page] = await browser.pages();
    browser.connection = await page.target().createCDPSession();

    if (this.config.inject) {
      await this.cacheInjections();
    }

    browser.on('targetcreated', async (target) => {
      const page = await target.page();
      if (page) this.instrumentPage(await target.page());
    });

    if (this.config.interceptor) {
      this.interceptorModules.push(this.config.interceptor);
      this.loadInterceptors();
    }

    this.browser = HackiumBrowser.create(browser);

    this.instrumentPage(page);
  }

  async instrumentPage(page: Page) {
    if (!page) return;

    for (let i = 0; i < this.cachedInjections.length; i++) {
      await page.evaluateOnNewDocument(this.cachedInjections[i]);
    }
    const interceptPatterns = this.config.intercept || [];
    const browser = this.browser;
    if (!browser) throw new Error('Browser not launched yet');
    interceptPatterns.forEach((pattern) => {
      page.intercept(patterns.Script(pattern), {
        onResponseReceived: (evt: Interceptor.OnResponseReceivedEvent) => {
          if (this.config.watch) this.loadInterceptors();
          let response = evt.response;
          this.interceptors.forEach((interceptor) => {
            if (response) evt.response = response;
            response = interceptor(browser, evt, DEBUG('hackium:interceptor'));
          });
          return response;
        },
      });
    });
  }

  loadInterceptors() {
    this.interceptors = [];
    this.interceptorModules.forEach((modulePath) => {
      try {
        const interceptorPath = path.join(this.config.pwd, modulePath);
        this.interceptors.push(
          importFresh(interceptorPath) as InterceptorSignature,
        );
      } catch (e) {
        this.log.warn(`Could not load interceptor: ${e.message}`);
      }
    });
  }

  async reloadInjections() {
    this.cachedInjections = [];
    this.cacheInjections();
  }

  async cacheInjections(files = this.config.inject) {
    this.debug(`reading files to inject on new document`);
    if (!files) return [];
    const readFiles = await Promise.allSettled(
      files.map((f) => {
        const location = path.join(this.config.pwd, f);
        this.debug(`reading ${location}`);
        return fs.readFile(location, 'utf-8').catch((e) => {
          this.log.warn(`couldn't read ${location}: ${e.message}`);
        });
      }),
    );
    const injections = readFiles
      .filter((p) => p.status === 'fulfilled')
      .map((p) => (p as PromiseFulfilledResult<string>).value);
    this.debug(`read ${injections.length} files`);
    this.cachedInjections = injections;
    return injections;
  }
}

export function browserBase(pluginConfig: ArgumentsWithDefaults) {
  return new HackiumBrowserBase(pluginConfig);
}
