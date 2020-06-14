
import DEBUG, { Debugger } from 'debug';
import Protocol from 'devtools-protocol';
import findRoot from 'find-root';
import { promises as fs } from 'fs';
import importFresh from 'import-fresh';
import path from 'path';
import { EvaluateFn, Page, SerializableOrJSHandle } from 'puppeteer';
import { Interceptor, intercept } from 'puppeteer-interceptor';
import { HackiumBrowser } from './hackium-browser';
import Logger from './logger';
import { strings } from './strings';
import { HackiumClientEvent } from './events';

const metadata = require(path.join(findRoot(__dirname), 'package.json'));

declare module 'puppeteer' {
  export interface Page {
    evaluateNowAndOnNewDocument(fn: EvaluateFn, ...args: SerializableOrJSHandle[]): Promise<void>
    log: Logger;
  }
}

// Make typescript happy with us referring to Page methods on the kinda-fake HackiumPage class
export interface HackiumPage extends Page { }

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

export class HackiumPage {
  instrumentationConfig: PageInstrumentationConfig = {
    injections: [],
    interceptors: [],
    watch: false,
    pwd: process.env.PWD || '/tmp'
  }
  log = new Logger('hackium:page');
  private interceptorModules: Interceptor[] = [];
  private cachedInjections: string[] = [];
  private defaultInjections = [
    path.join(findRoot(__dirname), 'client', 'hackium.js')
  ];

  evaluateNowAndOnNewDocument(fn: EvaluateFn, ...args: SerializableOrJSHandle[]): Promise<void> {
    return Promise.all([
      this.evaluate(fn, ...args),
      this.evaluateOnNewDocument(fn, ...args),
    ]).then(_ => { })
  }

  async instrumentSelf(config: PageInstrumentationConfig = this.instrumentationConfig) {
    this.instrumentationConfig = config;
    this.log.debug(`instrumenting page ${this.url()}`);

    await this.exposeFunction(strings.get('clienteventhandler')!, (data: any) => {
      const name = data.name;
      console.log(data);
      this.log.debug(`Received event '${name}' from client`);
      this.emit(`hackiumclient:${name}`, new HackiumClientEvent(name, data));
    });

    this.on('hackiumclient:pageActivated', (e: HackiumClientEvent) => {
      this.browser().hackium.setActivePage(this);
    })

    if (this.instrumentationConfig.injections) {
      await this.cacheInjections();
    }

    this.log.debug(`adding ${this.cachedInjections.length} scripts to evaluate on every load`);
    for (let i = 0; i < this.cachedInjections.length; i++) {
      await this.evaluateNowAndOnNewDocument(this.cachedInjections[i]);
    }

    const browser = this.browserContext().browser();
    if (!browser) throw new Error('Browser not launched yet');

    this.loadInterceptors();
    this.interceptorModules.forEach((interceptor) => {
      this.log.debug(`Registering interceptor for pattern ${interceptor.intercept}`);
      this.log.debug(interceptor.intercept);
      intercept(this, interceptor.intercept, {
        onResponseReceived: (evt: Interceptor.OnResponseReceivedEvent) => {
          this.log.debug(`Intercepted response for URL ${evt.request.url}`);
          if (this.instrumentationConfig.watch) this.loadInterceptors();
          let response = evt.response;
          this.interceptorModules.forEach((interceptor) => {
            if (response) evt.response = response;
            response = interceptor.interceptor(browser.hackium, evt, DEBUG('hackium:interceptor'));
          });
          return response;
        },
      });
    });
  }

  loadInterceptors() {
    this.log.debug(`loading ${this.instrumentationConfig.interceptors.length} interceptor modules`)
    this.instrumentationConfig.interceptors.forEach((modulePath) => {
      try {
        const interceptorPath = path.join(this.instrumentationConfig.pwd, modulePath);
        this.log.debug(`Reading interceptor module from ${interceptorPath}`)
        this.interceptorModules.push(
          importFresh(interceptorPath) as Interceptor,
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

  async cacheInjections(files = this.instrumentationConfig.injections) {
    this.log.debug(`reading files to inject on new document`);
    files = files.concat(this.defaultInjections);
    if (!files) return [];
    const readFiles = await Promise.allSettled(
      files.map((f) => {
        const location = f.startsWith(path.sep) ? f : path.join(this.instrumentationConfig.pwd, f);
        this.log.debug(`reading ${location} (originally ${f})`);
        return fs.readFile(location, 'utf-8')
          .then(src =>
            src
              .replace('%%%HACKIUM_VERSION%%%', metadata.version)
              .replace(/%%%(.+?)%%%/g, (m, $1) => {
                return strings.get($1)!
              })
          )
          .catch((e) => {
            this.log.warn(`couldn't read ${location}: ${e.message}`);
          });
      }),
    );
    const injections = readFiles
      .filter((p) => p.status === 'fulfilled')
      .map((p) => (p as PromiseFulfilledResult<string>).value);
    this.log.debug(`read ${injections.length} files`);
    this.cachedInjections = injections;
    return injections;
  }

  foo() {
    console.log('hey');
  }
}

