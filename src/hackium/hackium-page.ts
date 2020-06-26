
import DEBUG, { Debugger } from 'debug';
import Protocol from 'devtools-protocol';
import findRoot from 'find-root';
import { promises as fs } from 'fs';
import importFresh from 'import-fresh';
import path from 'path';
import { intercept, Interceptor } from 'puppeteer-interceptor';
import { CDPSession } from 'puppeteer/lib/Connection';
import { HTTPResponse } from 'puppeteer/lib/HTTPResponse';
import { PuppeteerLifeCycleEvent } from 'puppeteer/lib/LifecycleWatcher';
import { Page } from 'puppeteer/lib/Page';
import { Viewport } from 'puppeteer/lib/PuppeteerViewport';
import { Target } from 'puppeteer/lib/Target';
import { promisify } from 'util';
import { HackiumClientEvent } from '../events';
import Logger from '../util/logger';
import { waterfallMap, onlySettled } from '../util/promises';
import { HackiumBrowser } from './hackium-browser';
import { HackiumBrowserContext } from './hackium-browser-context';
import { HackiumKeyboard, HackiumMouse } from './hackium-input';
import { strings } from '../strings';
import { renderTemplate } from '../util/template';


interface WaitForOptions {
  timeout?: number;
  waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
}

export interface PageInstrumentationConfig {
  injections: string[];
  interceptors: string[];
  watch: boolean;
  pwd: string;
}

export interface Interceptor {
  intercept: Protocol.Fetch.RequestPattern[],
  interceptor: InterceptorSignature
}

type InterceptorSignature = (
  hackium: HackiumBrowser,
  evt: Interceptor.OnResponseReceivedEvent,
  debug: Debugger,
) => any;



export class HackiumPage extends Page {
  log = new Logger('hackium:page');
  clientLoaded = false;
  queuedActions: (() => void | Promise<void>)[] = [];
  instrumentationConfig: PageInstrumentationConfig = {
    injections: [],
    interceptors: [],
    watch: false,
    pwd: process.env.PWD || '/tmp'
  }
  _hmouse: HackiumMouse;
  _hkeyboard: HackiumKeyboard;
  private cachedInterceptors: Interceptor[] = [];
  private cachedInjections: string[] = [];
  private defaultInjections = [
    path.join(findRoot(__dirname), 'client', 'hackium.js')
  ];

  constructor(client: CDPSession, target: Target, ignoreHTTPSErrors: boolean) {
    super(client, target, ignoreHTTPSErrors);
    this._hkeyboard = new HackiumKeyboard(client);
    this._hmouse = new HackiumMouse(client, this._hkeyboard);
  }

  static hijackCreate = function (config: PageInstrumentationConfig) {
    Page.create = async function (
      client: CDPSession,
      target: Target,
      ignoreHTTPSErrors: boolean,
      defaultViewport: Viewport | null
    ): Promise<HackiumPage> {
      const page = new HackiumPage(client, target, ignoreHTTPSErrors);
      page.log.debug('Creating page');
      page.instrumentationConfig = config;
      // console.log(defaultViewport);
      // if (defaultViewport) await page.setViewport(defaultViewport);
      await page.__initialize(config);
      return page;
    }
  }

  private async __initialize(config: PageInstrumentationConfig) {
    //@ts-ignore I hate private methods.
    await super._initialize();
    if (this.cachedInterceptors.length === 0) this.loadInterceptors();
    await this.instrumentSelf(config);
  }

  executeOrQueue(action: () => void | Promise<void>) {
    if (this.clientLoaded) {
      return action;
    } else {
      this.queuedActions.push(action);
    }
  }

  evaluateNowAndOnNewDocument(fn: Function | string, ...args: unknown[]): Promise<void> {
    return Promise.all([
      this.evaluate(fn, ...args),
      this.evaluateOnNewDocument(fn, ...args),
    ]).then(_ => { })
  }

  browser(): HackiumBrowser {
    return super.browser() as HackiumBrowser;
  }

  browserContext(): HackiumBrowserContext {
    return super.browserContext() as HackiumBrowserContext;
  }

  // Have to override this due to a Puppeteer@4 type bug. Should be able to remove soon
  async goto(
    url: string,
    options?: WaitForOptions & { referer?: string }
  ): Promise<HTTPResponse> {
    return super.goto(url, options || {});
  }

  get mouse(): HackiumMouse {
    return this._hmouse;
  }

  get keyboard(): HackiumKeyboard {
    return this._hkeyboard;
  }

  private async instrumentSelf(config: PageInstrumentationConfig = this.instrumentationConfig) {
    this.instrumentationConfig = config;
    this.log.debug(`instrumenting page ${this.url()} with config %o`, config);

    await this.exposeFunction(strings.get('clienteventhandler'), (data: any) => {
      const name = data.name;
      this.log.debug(`Received event '${name}' from client with data %o`, data);
      this.emit(`hackiumclient:${name}`, new HackiumClientEvent(name, data));
    });

    this.on('hackiumclient:onClientLoaded', (e: HackiumClientEvent) => {
      this.clientLoaded = true;
      this.log.debug(`client loaded, running ${this.queuedActions.length} queued actions`);
      waterfallMap(this.queuedActions, async (action: () => void | Promise<void>, i: number) => {
        return await action();
      });
    })

    this.on('hackiumclient:pageActivated', (e: HackiumClientEvent) => {
      this.browser().setActivePage(this);
    })

    if (this.instrumentationConfig.injections) {
      await this.loadInjections();
    }

    this.log.debug(`adding ${this.cachedInjections.length} scripts to evaluate on every load`);
    for (let i = 0; i < this.cachedInjections.length; i++) {
      await this.evaluateNowAndOnNewDocument(this.cachedInjections[i]);
    }

    this.registerInterceptionRequests(this.cachedInterceptors);
  }

  private registerInterceptionRequests(interceptors: Interceptor[]) {
    const browser = this.browserContext().browser();
    interceptors.forEach((interceptor) => {
      this.log.debug(`Registering interceptor for pattern '${interceptor.intercept}'`);
      intercept(this, interceptor.intercept, {
        onResponseReceived: (evt: Interceptor.OnResponseReceivedEvent) => {
          this.log.debug(`Intercepted response for URL ${evt.request.url}`);
          // if (this.instrumentationConfig.watch) this.loadInterceptors();
          let response = evt.response;
          if (response) evt.response = response;
          return interceptor.interceptor(browser, evt, DEBUG('hackium:interceptor'));
        },
      });
    });
  }

  private loadInterceptors() {
    this.cachedInterceptors = [];
    this.log.debug(`loading ${this.instrumentationConfig.interceptors.length} interceptor modules`)
    this.instrumentationConfig.interceptors.forEach((modulePath) => {
      try {
        const interceptorPath = path.join(this.instrumentationConfig.pwd, modulePath);
        this.log.debug(`Reading interceptor module from ${interceptorPath}`)
        this.cachedInterceptors.push(
          importFresh(interceptorPath) as Interceptor,
        );
      } catch (e) {
        this.log.warn(`Could not load interceptor: ${e.message}`);
      }
    });
  }

  private async loadInjections() {
    this.log.debug(`reading files to inject on new document`);
    this.cachedInjections = [];
    const files = this.defaultInjections.concat(this.instrumentationConfig.injections);
    const injections = await onlySettled(
      files.map((f) => {
        const location = f.startsWith(path.sep) ? f : path.join(this.instrumentationConfig.pwd, f);
        this.log.debug(`reading ${location} (originally ${f})`);
        return fs.readFile(location, 'utf-8').then(renderTemplate)
      }),
    );
    this.log.debug(`read ${injections.length} files`);
    this.cachedInjections = injections;
    return injections;
  }

  addInterceptor(interceptor: Interceptor) {
    this.cachedInterceptors.push(interceptor);
    this.registerInterceptionRequests([interceptor]);
  }

}
