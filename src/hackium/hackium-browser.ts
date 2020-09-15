import assert from 'assert';
import { ChildProcess } from 'child_process';
import Protocol from 'devtools-protocol';
import findRoot from 'find-root';
import path from 'path';
import { decorateBrowser, ExtensionBridge, NullExtensionBridge } from 'puppeteer-extensionbridge';
import { Browser } from 'puppeteer/lib/cjs/puppeteer/common/Browser';
import { Connection } from 'puppeteer/lib/cjs/puppeteer/common/Connection';
import { Events } from 'puppeteer/lib/cjs/puppeteer/common/Events';
import { Viewport } from 'puppeteer/lib/cjs/puppeteer/common/PuppeteerViewport';
import { Target } from 'puppeteer/lib/cjs/puppeteer/common/Target';
import Logger from '../util/logger';
import { HackiumBrowserContext } from './hackium-browser-context';
import { HackiumPage } from './hackium-page';
import { HackiumTarget, TargetEmittedEvents } from './hackium-target';

const newTabTimeout = 500;

export enum HackiumBrowserEmittedEvents {
  ActivePageChanged = 'activePageChanged',
}

export type BrowserCloseCallback = () => Promise<void> | void;

export class HackiumBrowser extends Browser {
  log: Logger = new Logger('hackium:browser');
  activePage?: HackiumPage;
  connection: Connection;
  extension: ExtensionBridge = new NullExtensionBridge();
  _targets: Map<string, HackiumTarget> = new Map();
  __defaultContext: HackiumBrowserContext;
  __contexts: Map<string, HackiumBrowserContext> = new Map();
  __ignoreHTTPSErrors: boolean;
  __defaultViewport?: Viewport;
  newtab = `file://${path.join(findRoot(__dirname), 'pages', 'homepage', 'index.html')}`;

  constructor(
    connection: Connection,
    contextIds: string[],
    ignoreHTTPSErrors: boolean,
    defaultViewport?: Viewport,
    process?: ChildProcess,
    closeCallback?: BrowserCloseCallback,
  ) {
    super(connection, contextIds, ignoreHTTPSErrors, defaultViewport, process, closeCallback);
    this.connection = connection;
    this.__ignoreHTTPSErrors = ignoreHTTPSErrors;
    this.__defaultViewport = defaultViewport;
    this.__defaultContext = new HackiumBrowserContext(this.connection, this);
    this.__contexts = new Map();
    for (const contextId of contextIds) this.__contexts.set(contextId, new HackiumBrowserContext(this.connection, this, contextId));
    const listenerCount = this.connection.listenerCount('Target.targetCreated');

    if (listenerCount === 1) {
      this.connection.removeAllListeners('Target.targetCreated');
      this.connection.on('Target.targetCreated', this.__targetCreated.bind(this));
    } else {
      throw new Error('Need to reimplement how to intercept target creation. Submit a PR with a reproducible test case.');
    }
    this.log.debug('Hackium browser created');
  }

  async initialize() {
    await this.waitForTarget((target: Target) => target.type() === 'page');
    const [page] = await this.pages();
    this.setActivePage(page);
  }

  async pages(): Promise<HackiumPage[]> {
    const contextPages = await Promise.all(this.browserContexts().map((context) => context.pages()));
    return contextPages.reduce((acc, x) => acc.concat(x), []);
  }

  async newPage(): Promise<HackiumPage> {
    return this.__defaultContext.newPage();
  }

  browserContexts(): HackiumBrowserContext[] {
    return [this.__defaultContext, ...Array.from(this.__contexts.values())];
  }

  async createIncognitoBrowserContext(): Promise<HackiumBrowserContext> {
    const { browserContextId } = await this.connection.send('Target.createBrowserContext');
    const context = new HackiumBrowserContext(this.connection, this, browserContextId);
    this.__contexts.set(browserContextId, context);
    return context;
  }

  async _disposeContext(contextId?: string): Promise<void> {
    if (contextId) {
      await this.connection.send('Target.disposeBrowserContext', {
        browserContextId: contextId,
      });
      this.__contexts.delete(contextId);
    }
  }

  defaultBrowserContext(): HackiumBrowserContext {
    return this.__defaultContext;
  }

  async __targetCreated(event: Protocol.Target.TargetCreatedEvent): Promise<void> {
    const targetInfo = event.targetInfo;
    const { browserContextId } = targetInfo;

    const context =
      browserContextId && this.__contexts.has(browserContextId) ? this.__contexts.get(browserContextId) : this.__defaultContext;

    if (!context) throw new Error('Brower context should not be null or undefined');
    this.log.debug('Creating new target %o', targetInfo);
    const target = new HackiumTarget(
      targetInfo,
      context,
      () => this.connection.createSession(targetInfo),
      this.__ignoreHTTPSErrors,
      this.__defaultViewport || null,
    );

    assert(!this._targets.has(event.targetInfo.targetId), 'Target should not exist before targetCreated');
    this._targets.set(event.targetInfo.targetId, target);

    if (targetInfo.url === 'chrome://newtab/') {
      this.log.debug('New tab opened, waiting for it to navigate to custom newtab');
      await new Promise((resolve, reject) => {
        let done = false;
        const changedHandler = (targetInfo: Protocol.Target.TargetInfo) => {
          this.log.debug('New tab target info changed %o', targetInfo);
          if (targetInfo.url === this.newtab) {
            this.log.debug('New tab navigation complete, continuing');
            resolve();
            target.off(TargetEmittedEvents.TargetInfoChanged, changedHandler);
          }
        };
        target.on(TargetEmittedEvents.TargetInfoChanged, changedHandler);
        setTimeout(() => {
          this.log.debug(`New tab navigation timed out.`);
          if (!done) reject(`Timeout of ${newTabTimeout} exceeded`);
          target.off(TargetEmittedEvents.TargetInfoChanged, changedHandler);
        }, newTabTimeout);
      });
    }

    if (targetInfo.type === 'page') {
      // page objects are lazily created, so merely accessing this will instrument the page properly.
      const page = await target.page();
    }

    if (await target._initializedPromise) {
      this.emit(Events.Browser.TargetCreated, target);
      context.emit(Events.BrowserContext.TargetCreated, target);
    }
  }

  async maximize() {
    // hacky way of maximizing. --start-maximized and windowState:maximized don't work on macs. Check later.
    const [page] = await this.pages();
    const [width, height] = (await page.evaluate('[screen.availWidth, screen.availHeight];')) as [number, number];
    return this.setWindowBounds(width, height);
  }

  async setWindowBounds(width: number, height: number) {
    const window = (await this.connection.send('Browser.getWindowForTarget', {
      // @ts-ignore
      targetId: page._targetId,
    })) as { windowId: number };
    return this.connection.send('Browser.setWindowBounds', {
      windowId: window.windowId,
      bounds: { top: 0, left: 0, width, height },
    });
  }

  async clearSiteData(origin: string) {
    await this.connection.send('Storage.clearDataForOrigin', {
      origin,
      storageTypes: 'all',
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

  setActivePage(page: HackiumPage) {
    if (!page) {
      this.log.debug(`tried to set active page to invalid page object.`);
      return;
    }
    this.log.debug(`setting active page with URL %o`, page.url());
    this.activePage = page;
    this.emit(HackiumBrowserEmittedEvents.ActivePageChanged, page);
  }

  getActivePage() {
    if (!this.activePage) throw new Error('no active page in browser instance');
    return this.activePage;
  }
}
