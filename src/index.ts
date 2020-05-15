import DEBUG from 'debug';
import { promises as fs } from 'fs';
import path from 'path';
import { Browser, CDPSession, LaunchOptions, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { interceptor, patterns, Interceptor } from 'puppeteer-extra-plugin-interceptor';
import { extensionBridge } from 'puppeteer-extra-plugin-extensionbridge';
import { Arguments, defaultArguments } from './arguments';
import Logger from './logger';
import importFresh from 'import-fresh';

export { patterns } from 'puppeteer-interceptor';

const ENVIRONMENT = [
  'GOOGLE_API_KEY=no',
  'GOOGLE_DEFAULT_CLIENT_ID=no',
  'GOOGLE_DEFAULT_CLIENT_SECRET=no',
];

function setEnv(env: string[] = []) {
  env.forEach((e) => {
    const [key, val] = e.split('=');
    process.env[key] = val;
  });
}

type Fn = (...args: any[]) => any;

type InterceptorSignature = (
  hackium: Hackium,
  evt: Interceptor.OnResponseReceivedEvent,
  debug: Fn,
) => any

class Hackium extends Logger {
  browser?: Browser;

  private connection?: CDPSession;
  private config: Arguments = defaultArguments;

  private interceptors: InterceptorSignature[] = [];
  private interceptorModules: string[] = [];
  private cachedInjections: string[] = [];

  private defaultChromiumArgs: string[] = [
    '--disable-infobars',
    '--no-default-browser-check',
    `--load-extension=${path.join(__dirname, '..', 'theme')}`,
  ];

  private launchOptions: LaunchOptions = {
    devtools: true,
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation', '--disable-extensions'],
  };

  constructor(config?: Arguments) {
    super('hackium');
    this.debug('contructing Hackium instance');
    if (config) this.config = Object.assign({}, this.config, config);
    this.debug('Using config:');
    this.debug(this.config);

    setEnv(this.config.env);
    setEnv(ENVIRONMENT);

    this.launchOptions.headless = this.config.headless;
    if (this.config.userDataDir) this.launchOptions.userDataDir = this.config.userDataDir;
    this.launchOptions.args = this.defaultChromiumArgs;

    if (this.config.adblock) {
      this.debug('using adblocker');
      puppeteer.use(
        AdblockerPlugin({
          blockTrackers: true,
        }),
      );
    }

    if (this.config.interceptor) {
      this.debug('using interceptor');
      puppeteer.use(interceptor());
      this.interceptorModules.push(this.config.interceptor);
      this.loadInterceptors();
    }

    puppeteer.use(extensionBridge());
  }

  getConnection() {
    if (!this.connection) throw new Error('Attempt to capture CDP connection before initialized');
    return this.connection;
  }

  getBrowser() {
    if (!this.browser) throw new Error('Attempt to capture browser before initialized');
    return this.browser;
  }

  loadInterceptors() {
    this.interceptors = [];
    this.interceptorModules.forEach(modulePath => {
      try {
        const interceptorPath = path.join(
          this.config.pwd,
          modulePath,
        );
        this.interceptors.push(importFresh(interceptorPath) as InterceptorSignature);
      } catch (e) {
        this.warn(`Could not load interceptor: ${e.message}`);
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
          this.warn(`couldn't read ${location}: ${e.message}`);
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

  async instrumentPage(page: Page) {
    if (!page) return;

    for (let i = 0; i < this.cachedInjections.length; i++) {
      await page.evaluateOnNewDocument(this.cachedInjections[i]);
    }
    const interceptPatterns = this.config.intercept || [];
    interceptPatterns.forEach((pattern) => {
      page.intercept(patterns.Script(pattern), {
        onResponseReceived: (evt: Interceptor.OnResponseReceivedEvent) => {
          if (this.config.watch) this.loadInterceptors();
          let response = evt.response;
          this.interceptors.forEach(interceptor => {
            if (response) evt.response = response;
            response = interceptor(this, evt, DEBUG('hackium:interceptor'))
          })
          return response;
        },
      });
    });
  }

  async launch() {
    const browser = await puppeteer.launch(this.launchOptions);

    const [page] = await browser.pages();
    this.connection = await page.target().createCDPSession();

    if (this.config.inject) {
      await this.cacheInjections();
    }

    browser.on('targetcreated', async (target) => {
      this.instrumentPage(await target.page());
    });

    this.instrumentPage(page);

    return (this.browser = browser);
  }

  async setProxy(host: string, port: number) {
    var config = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: "http",
          host: host,
          port: port
        },
        bypassList: []
      }
    };
    const msg = { value: config, scope: 'regular' };

    return this.getBrowser().extension.send(`chrome.proxy.settings.set`, msg);
  }

  async maximize() {
    // hacky way of maximizing. --start-maximized and windowState:maximized don't work on macs. Check later.
    const [page] = await this.getBrowser().pages();
    const [width, height] = (await page.evaluate(
      '[screen.availWidth, screen.availHeight];',
    )) as [number, number];

    const window = (await this.getConnection().send('Browser.getWindowForTarget', {
      // @ts-ignore
      targetId: page._targetId,
    })) as { windowId: number };
    await this.getConnection().send('Browser.setWindowBounds', {
      windowId: window.windowId,
      bounds: { top: 0, left: 0, width, height },
    });
  }

  async setWindowBounds() {
    // await this.maximize();
  }

  async getActivePage(): Promise<Page | null> {
    const visibilityChecks = (await this.getBrowser().pages()).map((p) =>
      p.evaluate(`document.visibilityState]`).then((res) => [p, res]),
    );
    const results = await Promise.allSettled(visibilityChecks);
    for (let result of results) {
      if (result.status === 'fulfilled') {
        const page = result.value[0] as Page;
        return page;
      }
    }
    return null;
  }

  async cliBehavior() {
    const browser = await this.launch();
    await this.setWindowBounds();
    const [page] = await browser.pages();
    this.debug(`navigating to ${this.config.url}`);
    await page.goto(this.config.url);
    await this.setProxy("127.0.0.1", 5080);
  }

  async close() {
    return this.getBrowser().close();
  }
}

export default Hackium;
