import DEBUG from 'debug';
import { promises as fs } from 'fs';
import path from 'path';
import { Browser, CDPSession, LaunchOptions, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { interceptor, patterns } from 'puppeteer-extra-plugin-interceptor';
import { Interceptor } from 'puppeteer-interceptor';
import { Arguments } from './arguments';
import { NullBrowser } from './nullbrowser';
import { NullCDPSession } from './nullcdpsession';
import Logger from './logger';

export { patterns } from 'puppeteer-interceptor';

const ENVIRONMENT = [
  'GOOGLE_API_KEY=no',
  'GOOGLE_DEFAULT_CLIENT_ID=no',
  'GOOGLE_DEFAULT_CLIENT_SECRET=no',
]

function setEnv(env: string[] = []) {
  env.forEach(e => {
    const [key, val] = e.split('=');
    process.env[key] = val;
  });
}

type Fn = (...args: any[]) => any;

class Hackium extends Logger {
  config: Arguments = {
    url: 'https://example.com',
    adblock: false,
    env: [],
    pwd: process.cwd(),
    headless: false
  };

  interceptor?: (hackium: Hackium, evt: Interceptor.OnResponseReceivedEvent, debug: Fn) => any;
  browser: Browser;
  connection: CDPSession;

  launchOptions: LaunchOptions = {
    headless:false,
    defaultViewport:null,
    devtools:true,
    args: [
      '--disable-infobars', 
      '--no-default-browser-check',
      `--load-extension=${path.join(__dirname,  '..','theme')}`
      // `--user-data-dir=${path.join(__dirname, '..', '..' ,'userdata')}` 
    ],
    ignoreDefaultArgs: ['--enable-automation', '--disable-extensions']
  };

  constructor(config?: Arguments) {
    super('hackium');
    this.debug('contructing Hackium instance');
    if (config) this.config = config;

    this.browser = new NullBrowser();
    this.connection =  new NullCDPSession();

    setEnv(this.config.env);
    setEnv(ENVIRONMENT);

    this.launchOptions.headless = this.config.headless;

    if (this.config.adblock) {
      this.debug('using adblocker');
      puppeteer.use(AdblockerPlugin({
        blockTrackers: true
      }));
    }

    if (this.config.interceptor) {
      this.debug('using interceptor');
      puppeteer.use(interceptor());
      try {
        const interceptorPath = path.join(this.config.pwd, this.config.interceptor);
        this.interceptor = require(interceptorPath);
      } catch(e) {
        this.warn(`Could not load interceptor: ${e.message}`);
      }
    }
  }

  async launch() {
    const browser = await puppeteer.launch(this.launchOptions);

    const [ page ] = await browser.pages();
    this.connection = await page.target().createCDPSession();

    let injections: string[] = [];

    if (this.config.inject) {
      this.debug(`reading files to inject on new document`);
      const readFiles = await Promise.allSettled(
        this.config.inject
          .map(f => {
            const location = path.join(this.config.pwd, f);
            this.debug(`reading ${location}`);
            return fs.readFile(location, 'utf-8').catch(e => {
              this.warn(`couldn't read ${location}: ${e.message}`)
            })
          }
        )
      );
      injections = readFiles.filter(p => p.status === 'fulfilled').map(p => (p as PromiseFulfilledResult<string>).value);
      this.debug(`read ${injections.length} files`);
    }

    const instrumentPage = async (page:Page) => {
      if (!page) return;

      for (let i = 0; i < injections.length; i++) {
        await page.evaluateOnNewDocument(injections[i]);
      }
      const interceptPatterns = this.config.intercept || [];
      interceptPatterns.forEach(pattern => {
        
        page.intercept(patterns.Script(pattern), {onResponseReceived: (evt) => {
          return this.interceptor && this.interceptor(this, evt, DEBUG('hackium:interceptor'))
        }});
      })
    };

    browser.on('targetcreated', async target => {
      instrumentPage(await target.page());
    });

    instrumentPage(page);

    return this.browser = browser;
  }

  async maximize() {
    // hacky way of maximizing. --start-maximized and windowState:maximized don't work on macs. Check later.
    const [ page ] = await this.browser.pages();
    const [width, height] = await page.evaluate('[screen.availWidth, screen.availHeight];') as [number, number];

    // @ts-ignore
    const window = await this.connection.send('Browser.getWindowForTarget', {targetId: page._targetId}) as {windowId: number};
    await this.connection.send('Browser.setWindowBounds', {windowId: window.windowId, bounds:{top:0,left:0,width,height}});
  }

  async setWindowBounds() {
    await this.maximize();
  }

  async getActivePage(): Promise<Page | null> {
    const visibilityChecks = (await this.browser.pages())
      .map(p => p.evaluate(`document.visibilityState]`).then(res => [p, res]));
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
  }

  async close() {
    return this.browser.close();
  }
}

export default Hackium;
