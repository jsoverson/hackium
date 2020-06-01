import path from 'path';
import { LaunchOptions } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { extensionBridge } from 'puppeteer-extra-plugin-extensionbridge';
import { interceptor } from 'puppeteer-extra-plugin-interceptor';
import { Arguments, defaultArguments } from './arguments';
import { browserBase, HackiumBrowserBase } from './extensions/hackium-browser-base';
import { HackiumBrowser } from './hackium-browser';
import Logger from './logger';

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

  private config: Arguments = defaultArguments;
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
    if (this.config.userDataDir) this.launchOptions.userDataDir = this.config.userDataDir;
    this.launchOptions.args = this.defaultChromiumArgs;

    puppeteer.use(extensionBridge());

    if (this.config.adblock) {
      this.log.debug('using adblocker');
      puppeteer.use(
        AdblockerPlugin({
          blockTrackers: true,
        }),
      );
    }

    if (this.config.interceptor) {
      this.log.debug('using interceptor');
      puppeteer.use(interceptor());
    }

    puppeteer.use(this.base = browserBase(config));

  }

  getBrowser(): HackiumBrowser {
    if (!this.browser) throw new Error('Attempt to capture browser before initialized');
    return this.browser;
  }

  async launch() {
    const browser = await puppeteer.launch(this.launchOptions);
    this.browser = this.base.browser;
    return browser;
  }

  async cliBehavior() {
    const browser = await this.launch();
    const [page] = await browser.pages();
    this.log.debug(`navigating to ${this.config.url}`);
    await page.goto(this.config.url);
    return browser;
  }

  async close() {
    return this.getBrowser().close();
  }
}

export default Hackium;
