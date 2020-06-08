import { promises as fsp } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import vanillaPuppeteer, { LaunchOptions } from 'puppeteer';
import { addExtra, PuppeteerExtra } from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { extensionBridge } from 'puppeteer-extra-plugin-extensionbridge';
import { interceptor } from 'puppeteer-extra-plugin-interceptor';
import vm from 'vm';
import { Arguments, ArgumentsWithDefaults, defaultArguments } from './arguments';
import { browserBase, HackiumBrowserBase } from './extensions/hackium-browser-base';
import { HackiumBrowser } from './hackium-browser';
import Logger from './logger';
import { waterfallMap } from './waterfallMap';

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

class Hackium {
  browser?: HackiumBrowser;
  log = new Logger('hackium');
  private puppeteer?: PuppeteerExtra;

  private config: ArgumentsWithDefaults = defaultArguments;
  private base: HackiumBrowserBase;

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

  constructor(config: Arguments = defaultArguments) {
    this.log.debug('contructing Hackium instance');
    if (config) this.config = Object.assign({}, this.config, config);
    this.log.debug('Using config:');
    this.log.debug(this.config);

    setEnv(this.config.env);
    setEnv(ENVIRONMENT);

    this.launchOptions.headless = this.config.headless;
    if (this.config.userDataDir)
      this.launchOptions.userDataDir = this.config.userDataDir;
    this.launchOptions.args = this.defaultChromiumArgs;

    this.puppeteer = addExtra(vanillaPuppeteer);

    this.puppeteer.use(extensionBridge());

    if (this.config.adblock) {
      this.log.debug('using adblocker');
      this.puppeteer.use(
        AdblockerPlugin({
          blockTrackers: true,
        }),
      );
    }

    if (this.config.interceptor) {
      this.log.debug('using interceptor');
      this.puppeteer.use(interceptor());
    }

    this.puppeteer.use((this.base = browserBase(this.config)));
  }

  getBrowser(): HackiumBrowser {
    if (!this.browser)
      throw new Error('Attempt to capture browser before initialized');
    return this.browser;
  }

  async launch(options: LaunchOptions = {}) {
    if (!this.puppeteer)
      throw new Error('Hackium initialization failed in some horrible way');
    const browser = await this.puppeteer.launch(
      Object.assign(options, this.launchOptions),
    );
    this.browser = this.base.browser;
    return browser;
  }

  async cliBehavior() {
    const browser = await this.launch();
    const [page] = await browser.pages();
    this.log.debug(`navigating to ${this.config.url}`);
    await page.goto(this.config.url);
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
    return this.getBrowser().close();
  }
}

export default Hackium;
