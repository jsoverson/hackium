import assert from 'assert';
import { ChildProcess } from 'child_process';
import findRoot from 'find-root';
import path from 'path';
import { decorateBrowser, ExtensionBridge, NullExtensionBridge } from 'puppeteer-extensionbridge';
import { Browser } from 'puppeteer/lib/Browser';
import { Connection } from 'puppeteer/lib/Connection';
import { Events } from 'puppeteer/lib/Events';
import { Page } from 'puppeteer/lib/Page';
import Protocol from 'puppeteer/lib/protocol';
import { Viewport } from 'puppeteer/lib/PuppeteerViewport';
import { Target } from 'puppeteer/lib/Target';
import { HackiumPage } from './hackium-page';
import { HackiumTarget, TargetEmittedEvents } from './hackium-target';
import Logger from '../util/logger';

const newTabTimeout = 500;

export enum HackiumBrowserEmittedEvents {
  ActivePageChanged = 'activePageChanged'
}

export type BrowserCloseCallback = () => Promise<void> | void;

export class HackiumBrowser extends Browser {
  log: Logger = new Logger('hackium:browser');
  activePage?: Page;
  connection: Connection;
  extension: ExtensionBridge = new NullExtensionBridge();
  _targets: Map<string, HackiumTarget> = new Map();
  newtab = `file://${path.join(findRoot(__dirname), 'pages', 'newtab', 'index.html')}`;
  private _initializationPromise: Promise<unknown>;

  constructor(
    connection: Connection,
    contextIds: string[],
    ignoreHTTPSErrors: boolean,
    defaultViewport?: Viewport,
    process?: ChildProcess,
    closeCallback?: BrowserCloseCallback
  ) {
    super(connection, contextIds, ignoreHTTPSErrors, defaultViewport, process, closeCallback);
    this.connection = connection;
    this.log.debug('Hackium browser created');
    this._initializationPromise = this._initialize();
  }

  private _initialize() {
    return (async () => {
      this.log.debug('initializing and decorating browser instance');
      await decorateBrowser(this, { newtab: this.newtab });
      let lastActive = { tabId: -1, windowId: -1 };
      await this.extension.addListener('chrome.tabs.onActivated', async ({ tabId, windowId }) => {
        lastActive = { tabId, windowId };
        const code = `
          window.postMessage({owner:'hackium', name:'pageActivated', data:{tabId:${tabId}, windowId:${windowId}}});
        `;
        this.log.debug(`chrome.tabs.onActivated triggered. Calling ${code}`);
        await this.extension.send('chrome.tabs.executeScript', tabId, { code })
      });
      await this.extension.addListener('chrome.tabs.onUpdated', async (tabId) => {
        if (tabId === lastActive.tabId) {
          const code = `
            window.postMessage({owner:'hackium', name:'pageActivated', data:{tabId:${tabId}}});
          `;
          this.log.debug(`Active page updated. Calling ${code}`);
          await this.extension.send('chrome.tabs.executeScript', tabId, { code })
        }
      });

      await this.waitForTarget((target: Target) => target.type() === 'page');
      const [page] = await this.pages();
      this.setActivePage(page);
    })();
  }

  onInitialization() {
    return this._initializationPromise;
  }

  pages() {
    return super.pages() as Promise<HackiumPage[]>;
  }

  newPage(): Promise<HackiumPage> {
    return super.newPage() as Promise<HackiumPage>;
  }

  async _targetCreated(
    event: Protocol.Target.targetCreatedPayload
  ): Promise<void> {
    const targetInfo = event.targetInfo;
    const { browserContextId } = targetInfo;
    const context =
      browserContextId && this._contexts.has(browserContextId)
        ? this._contexts.get(browserContextId)
        : this._defaultContext;

    assert(context, 'Brower context should not be null or undefined');
    this.log.debug('Creating new target %o', targetInfo);
    const target = new HackiumTarget(
      targetInfo,
      context,
      () => this._connection.createSession(targetInfo),
      this._ignoreHTTPSErrors,
      this._defaultViewport || null
    );

    assert(
      !this._targets.has(event.targetInfo.targetId),
      'Target should not exist before targetCreated'
    );
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
    const [width, height] = (await page.evaluate(
      '[screen.availWidth, screen.availHeight];',
    )) as [number, number];
    return this.setWindowBounds(width, height);
  }

  async setWindowBounds(width: number, height: number) {
    const window = (await this.connection.send(
      'Browser.getWindowForTarget',
      {
        // @ts-ignore
        targetId: page._targetId,
      },
    )) as { windowId: number };
    return this.connection.send('Browser.setWindowBounds', {
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
    if (!page) this.log.debug(`tried to set active page to invalid page object.`);
    this.log.debug(`setting active page (${page.url()})`);
    this.activePage = page;
    this.emit(HackiumBrowserEmittedEvents.ActivePageChanged, page);
  }

  getActivePage() {
    if (!this.activePage) throw new Error('no active page in browser instance');
    return this.activePage;
  }

}
