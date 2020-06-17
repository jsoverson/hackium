import { ChildProcess } from 'child_process';
import { Browser } from 'puppeteer/lib/Browser';
import { Connection } from 'puppeteer/lib/Connection';
import { Page } from 'puppeteer/lib/Page';
import { Viewport } from 'puppeteer/lib/PuppeteerViewport';
import Logger from './logger';
import { ExtensionBridge } from 'puppeteer-extra-plugin-extensionbridge';
import { HackiumPage } from './hackium-page';
import assert from 'assert';
import Protocol from 'puppeteer/lib/protocol';
import { Target } from 'puppeteer/lib/Target';
import { Events } from 'puppeteer/lib/Events';
import { HackiumTarget } from './hackium-target';
export const { Browser: PuppeteerBrowser } = require('puppeteer/lib/Browser');

declare module 'puppeteer/lib/Browser' {
  export interface Browser {
    extension: ExtensionBridge;
  }
}

export type BrowserCloseCallback = () => Promise<void> | void;

export class HackiumBrowser extends Browser {
  log: Logger = new Logger('hackium:browser');
  activePage?: Page;
  connection: Connection;
  _targets: Map<string, HackiumTarget> = new Map();

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

    if (targetInfo.type === 'page') {
      // page objects are lazily created, so merely accessing this will instrument the page properly.
      await target.page();
    }

    if (await target._initializedPromise) {
      this.emit(Events.Browser.TargetCreated, target);
      context.emit(Events.BrowserContext.TargetCreated, target);
    }
  }

  // async _createPageInContext(contextId?: string, url: string = 'about:blank'): Promise<Page> {
  //   this.log.debug('creating new target');
  //   const { targetId } = await this._connection.send('Target.createTarget', {
  //     url,
  //     browserContextId: contextId || undefined,
  //   });
  //   const target = await this._targets.get(targetId);
  //   assert(
  //     await target._initializedPromise,
  //     'Failed to create target for page'
  //   );
  //   const page = await target.page();
  //   return page;
  // }

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
    this.log.debug(`setting active page (${page.url()})`);
    this.activePage = page;
  }

  getActivePage() {
    if (!this.activePage) throw new Error('no active page in browser instance');
    return this.activePage;
  }

}
