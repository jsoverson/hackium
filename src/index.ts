import { promises as fsp } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import vanillaPuppeteer, { LaunchOptions } from 'puppeteer';
import { addExtra, PuppeteerExtra } from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { extensionBridge, ExtensionBridge } from 'puppeteer-extra-plugin-extensionbridge';
import vm from 'vm';
import { Arguments, ArgumentsWithDefaults, defaultArguments } from './arguments';
import { HackiumBrowser } from './hackium-browser';
import Logger from './logger';
import { waterfallMap } from './waterfallMap';
import { EventEmitter } from 'events';
import findRoot from 'find-root';
import { overridePuppeteerMethods, resetOverriddenPuppeteerMethods } from './puppeteer-overrides';
import { HackiumClientEvent } from './events';

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

declare module 'puppeteer' {
  export interface Browser {
    connection: CDPSession;
    extension: ExtensionBridge;
  }
  // extending the events that can fire from Page objects
  export interface PageEventObj {
    'hackiumclient:pageActivated': HackiumClientEvent;
  }
}

class Hackium extends EventEmitter {
  browser?: HackiumBrowser;
  log = new Logger('hackium');
  private puppeteer?: PuppeteerExtra;

  config: ArgumentsWithDefaults = defaultArguments;

  private defaultChromiumArgs: string[] = [
    '--disable-infobars',
    '--no-default-browser-check',
    `--load-extension=${path.join(findRoot(__dirname), 'extensions', 'theme')}`,
    `--homepage=file://${path.join(findRoot(__dirname), 'pages', 'homepage', 'index.html')}`,
    `file://${path.join(findRoot(__dirname), 'pages', 'homepage', 'index.html')}`
  ];

  private launchOptions: LaunchOptions = {
    devtools: true,
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation', '--disable-extensions'],
  };

  constructor(config: Arguments = defaultArguments) {
    super();
    this.log.debug('contructing Hackium instance');
    if (config) this.config = Object.assign({}, this.config, config);
    this.log.debug('Using config:');
    this.log.debug(this.config);

    setEnv(this.config.env);
    setEnv(ENVIRONMENT);

    this.launchOptions.headless = this.config.headless;
    if (this.config.userDataDir) {
      this.launchOptions.userDataDir = this.config.userDataDir;
    }
    this.launchOptions.args = this.defaultChromiumArgs;
    if (this.config.chromeOutput) {
      this.launchOptions.dumpio = true;
      this.defaultChromiumArgs.push(
        '--enable-logging=stderr',
        '--v=1',
      );
    }

    this.puppeteer = addExtra(vanillaPuppeteer);

    this.puppeteer.use(extensionBridge({
      newtab: `file://${path.join(findRoot(__dirname), 'pages', 'newtab', 'index.html')}`
    }));

    if (this.config.adblock) {
      this.log.debug('using adblocker');
      this.puppeteer.use(
        AdblockerPlugin({
          blockTrackers: true,
        }),
      );
    }

    overridePuppeteerMethods({
      page: {
        injections: this.config.inject,
        interceptors: this.config.interceptor,
        watch: this.config.watch,
        pwd: this.config.pwd
      }
    });
  }

  getBrowser(): HackiumBrowser {
    if (!this.browser)
      throw new Error('Attempt to capture browser before initialized');
    return this.browser;
  }

  async launch(options: LaunchOptions = {}) {
    if (!this.puppeteer) {
      throw new Error('Hackium initialization failed - no access to puppeteer object. Error:Puppeteer');
    }
    const browser = await this.puppeteer.launch(
      Object.assign(options, this.launchOptions),
    );

    this.browser = await HackiumBrowser.create(browser);

    const [page] = await this.browser.pages();
    this.browser.setActivePage(page);
    browser.connection = await page.target().createCDPSession();

    await browser.extension.addListener('chrome.tabs.onActivated', async ({ tabId, windowId }) => {
      const code = `window.postMessage({owner:'hackium', name:'pageActivated', data:{tabId:${tabId}, windowId:${windowId}}})`;
      this.log.debug(`chrome.tabs.onActivated triggered. Calling ${code}`);
      try {
        const result = await browser.extension.send('chrome.tabs.executeScript', tabId, {
          code,
          matchAboutBlank: true
        })
      } catch (e) {
        this.log.error('Error posting message for pageActivated');
        this.log.error(e.message);
      }
    })

    return this.browser;
  }

  async cliBehavior() {
    const browser = await this.launch();
    const [page] = await browser.pages();
    if (this.config.url) {
      this.log.debug(`navigating to ${this.config.url}`);
      await page.goto(this.config.url);
    }
    await waterfallMap(this.config.execute, (file) => {
      return this.runScript(file).then((result) => console.log(result));
    });
    return browser;
  }

  async runScript(file: string, args: any[] = [], src?: string) {
    if (!src) {
      src = await fsp.readFile(file, 'utf-8');
    }

    const browser = await this.getBrowser();
    const pages = await browser.pages();
    const [page] = pages;

    const context = {
      hackium: this,
      console,
      page,
      pages,
      browser,
      module,
      require: createRequire(file),
      __dirname: path.dirname(file),
      __filename: path.resolve(file),
      args: this.config._,
      __rootResult: null,
    };
    vm.createContext(context);

    const wrappedSrc = `
    __rootResult = (async function hackiumScript(){${src}}())
    `;

    try {
      vm.runInContext(wrappedSrc, context);
      const result = await context.__rootResult;
      return result;
    } catch (e) {
      console.log('Error in hackium script');
      console.log(e);
    }
  }

  async close() {
    if (this.browser) return this.browser.close();
  }

  async cleanup() {
    resetOverriddenPuppeteerMethods();
  }
}

export default Hackium;
