import DEBUG, { Debugger } from 'debug';
import Protocol from 'devtools-protocol';
import findRoot from 'find-root';
import importFresh from 'import-fresh';
import path from 'path';
import { intercept, InterceptionHandler, Interceptor } from 'puppeteer-interceptor';
import { CDPSession } from 'puppeteer/lib/cjs/puppeteer/common/Connection';
import { HTTPResponse } from 'puppeteer/lib/cjs/puppeteer/common/HTTPResponse';
import { PuppeteerLifeCycleEvent } from 'puppeteer/lib/cjs/puppeteer/common/LifecycleWatcher';
import { Page } from 'puppeteer/lib/cjs/puppeteer/common/Page';
import { Viewport } from 'puppeteer/lib/cjs/puppeteer/common/PuppeteerViewport';
import { Target } from 'puppeteer/lib/cjs/puppeteer/common/Target';
import { HackiumClientEvent } from '../events';
import { strings } from '../strings';
import { read, resolve, watch } from '../util/file';
import Logger from '../util/logger';
import { onlySettled, waterfallMap } from '../util/promises';
import { renderTemplate } from '../util/template';
import { HackiumBrowser } from './hackium-browser';
import { HackiumBrowserContext } from './hackium-browser-context';
import { HackiumKeyboard, HackiumMouse } from './hackium-input';
import { EvaluateFn, SerializableOrJSHandle } from 'puppeteer/lib/cjs/puppeteer/common/EvalTypes';

interface WaitForOptions {
  timeout?: number;
  waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
}

export interface PageInstrumentationConfig {
  injectionFiles: string[];
  interceptorFiles: string[];
  watch: boolean;
  pwd: string;
}

export interface Interceptor {
  intercept: Protocol.Fetch.RequestPattern[];
  interceptor: InterceptorSignature;
  handler?: InterceptionHandler;
}

type InterceptorSignature = (hackium: HackiumBrowser, evt: Interceptor.OnResponseReceivedEvent, debug: Debugger) => any;

export class HackiumPage extends Page {
  log = new Logger('hackium:page');
  clientLoaded = false;
  queuedActions: (() => void | Promise<void>)[] = [];
  instrumentationConfig: PageInstrumentationConfig = {
    injectionFiles: [],
    interceptorFiles: [],
    watch: false,
    pwd: process.env.PWD || '/tmp',
  };
  _hmouse: HackiumMouse;
  _hkeyboard: HackiumKeyboard;
  private cachedInterceptors: Interceptor[] = [];
  private cachedInjections: string[] = [];
  private defaultInjections = [path.join(findRoot(__dirname), 'client', 'hackium.js')];

  constructor(client: CDPSession, target: Target, ignoreHTTPSErrors: boolean) {
    super(client, target, ignoreHTTPSErrors);
    this._hkeyboard = new HackiumKeyboard(client);
    this._hmouse = new HackiumMouse(client, this._hkeyboard, this);
  }

  static hijackCreate = function (config: PageInstrumentationConfig) {
    Page.create = async function (
      client: CDPSession,
      target: Target,
      ignoreHTTPSErrors: boolean,
      defaultViewport: Viewport | null,
    ): Promise<HackiumPage> {
      const page = new HackiumPage(client, target, ignoreHTTPSErrors);
      page.log.debug('Created page new page for target %o', target._targetId);
      page.instrumentationConfig = config;
      await page.__initialize(config);
      return page;
    };
  };

  private async __initialize(config: PageInstrumentationConfig) {
    //@ts-ignore I hate private methods.
    await super._initialize();
    if (this.cachedInterceptors.length === 0) this.loadInterceptors();
    try {
      await this.instrumentSelf(config);
    } catch (e) {
      if (e.message && e.message.match(/Protocol error.*Target closed/)) {
        this.log.debug(
          'Error: Page instrumentation failed: communication could not be estalished due to a protocol error.\n' +
            '-- This is likely because the page has already been closed. It is probably safe to ignore this error if you do not observe any problems in casual usage.',
        );
      } else {
        throw e;
      }
    }
  }

  executeOrQueue(action: () => void | Promise<void>) {
    if (this.clientLoaded) {
      return action;
    } else {
      this.queuedActions.push(action);
    }
  }

  evaluateNowAndOnNewDocument(fn: EvaluateFn | string, ...args: SerializableOrJSHandle[]): Promise<void> {
    return Promise.all([this.evaluate(fn, ...args), this.evaluateOnNewDocument(fn, ...args)])
      .catch((e) => {
        this.log.debug(e);
      })
      .then((_) => {});
  }

  browser(): HackiumBrowser {
    return super.browser() as HackiumBrowser;
  }

  browserContext(): HackiumBrowserContext {
    return super.browserContext() as HackiumBrowserContext;
  }

  // Have to override this due to a Puppeteer@4 type bug. Should be able to remove soon
  async goto(url: string, options?: WaitForOptions & { referer?: string }): Promise<HTTPResponse> {
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
    this.log.debug(`instrumenting page %o with config %o`, this.url(), config);

    await this.exposeFunction(strings.get('clienteventhandler'), (data: any) => {
      const name = data.name;
      this.log.debug(`Received event '%o' from client with data %o`, name, data);
      this.emit(`hackiumclient:${name}`, new HackiumClientEvent(name, data));
    });

    this.on('hackiumclient:onClientLoaded', (e: HackiumClientEvent) => {
      this.clientLoaded = true;
      this.log.debug(`client loaded, running %o queued actions`, this.queuedActions.length);
      waterfallMap(this.queuedActions, async (action: () => void | Promise<void>, i: number) => {
        return await action();
      });
    });

    this.on('hackiumclient:pageActivated', (e: HackiumClientEvent) => {
      this.browser().setActivePage(this);
    });

    if (this.instrumentationConfig.injectionFiles) {
      await this.loadInjections();
    }

    this.log.debug(`adding %o scripts to evaluate on every load`, this.cachedInjections.length);
    for (let i = 0; i < this.cachedInjections.length; i++) {
      await this.evaluateNowAndOnNewDocument(this.cachedInjections[i]);
    }

    this.registerInterceptionRequests(this.cachedInterceptors);
  }

  private registerInterceptionRequests(interceptors: Interceptor[]) {
    const browser = this.browserContext().browser();
    interceptors.forEach(async (interceptor) => {
      if (interceptor.handler) {
        this.log.debug('skipped re-registering interception handler for %o', interceptor.intercept);
        return;
      }
      this.log.debug(`Registering interceptor for pattern %o`, interceptor.intercept);
      const handler = await intercept(this, interceptor.intercept, {
        onResponseReceived: (evt: Interceptor.OnResponseReceivedEvent) => {
          this.log.debug(`Intercepted response for URL %o`, evt.request.url);
          let response = evt.response;
          if (response) evt.response = response;
          return interceptor.interceptor(browser, evt, DEBUG('hackium:interceptor'));
        },
      });
      interceptor.handler = handler;
    });
  }

  private loadInterceptors() {
    this.cachedInterceptors = [];
    this.log.debug(`loading: %o interceptor modules`, this.instrumentationConfig.interceptorFiles.length);
    this.instrumentationConfig.interceptorFiles.forEach((modulePath) => {
      try {
        const interceptorPath = resolve([modulePath], this.instrumentationConfig.pwd);
        const interceptor = importFresh(interceptorPath) as Interceptor;
        if (this.instrumentationConfig.watch) {
          watch(interceptorPath, (file: string) => {
            this.log.debug('interceptor modified, disabling ');
            if (interceptor.handler) interceptor.handler.disable();
            const reloadedInterceptor = importFresh(interceptorPath) as Interceptor;
            this.addInterceptor(reloadedInterceptor);
          });
        }
        this.log.debug(`Reading interceptor module from %o`, interceptorPath);
        this.cachedInterceptors.push(interceptor);
      } catch (e) {
        this.log.warn(`Could not load interceptor: %o`, e.message);
      }
    });
  }

  private async loadInjections() {
    this.cachedInjections = [];
    const files = this.defaultInjections.concat(this.instrumentationConfig.injectionFiles);
    this.log.debug(
      `loading: %o modules to inject before page load (%o default, %o user) `,
      files.length,
      this.defaultInjections.length,
      this.instrumentationConfig.injectionFiles.length,
    );
    const injections = await onlySettled(
      files.map((f) => {
        const location = resolve([f], this.instrumentationConfig.pwd);
        this.log.debug(`reading %o (originally %o)`, location, f);
        // if (this.instrumentationConfig.watch) {
        //    turns out Puppeteer doesn't expose the Script identifier on evaluateOnNewDoc
        //    so watching and reloading in the current page may be a PITA.
        //    I'm leaving this here so you know not to bother implementing watch functionality
        //    unless you want to reimplement a bunch of Puppeteer stuff.
        // }
        return read(location).then(renderTemplate);
      }),
    );
    this.log.debug(`successfully read %o files`, injections.length);
    this.cachedInjections = injections;
    return injections;
  }

  addInterceptor(interceptor: Interceptor) {
    this.log.debug('adding interceptor for pattern %o', interceptor.intercept);
    this.cachedInterceptors.push(interceptor);
    this.registerInterceptionRequests([interceptor]);
  }
}
