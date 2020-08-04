import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import findRoot from 'find-root';
import { createRequire } from 'module';
import path from 'path';
import { mergeLaunchOptions } from 'puppeteer-extensionbridge';
import { Browser } from 'puppeteer/lib/cjs/common/Browser';
import { Connection } from 'puppeteer/lib/cjs/common/Connection';
import { Viewport } from 'puppeteer/lib/cjs/common/PuppeteerViewport';
import { LaunchOptions } from 'puppeteer/lib/cjs/node/LaunchOptions';
import vm from 'vm';
import { Arguments, ArgumentsWithDefaults, defaultArguments } from '../arguments';
import puppeteer from '../puppeteer';
import { read, resolve } from '../util/file';
import Logger from '../util/logger';
import { waterfallMap } from '../util/promises';
import { PuppeteerLaunchOptions } from '../util/types';
import { BrowserCloseCallback, HackiumBrowser } from './hackium-browser';
import { HackiumPage } from './hackium-page';

const ENVIRONMENT = ['GOOGLE_API_KEY=no', 'GOOGLE_DEFAULT_CLIENT_ID=no', 'GOOGLE_DEFAULT_CLIENT_SECRET=no'];

function setEnv(env: string[] = []) {
  env.forEach((e) => {
    const [key, val] = e.split('=');
    process.env[key] = val;
  });
}

Browser.create = async function (
  connection: Connection,
  contextIds: string[],
  ignoreHTTPSErrors: boolean,
  defaultViewport?: Viewport,
  process?: ChildProcess,
  closeCallback?: BrowserCloseCallback,
): Promise<HackiumBrowser> {
  const browser = new HackiumBrowser(connection, contextIds, ignoreHTTPSErrors, defaultViewport, process, closeCallback);
  await connection.send('Target.setDiscoverTargets', { discover: true });
  return browser;
};

export class Hackium extends EventEmitter {
  browser?: HackiumBrowser;
  log = new Logger('hackium');
  version = require(path.join(findRoot(__dirname), 'package.json')).version;

  config: ArgumentsWithDefaults = defaultArguments;

  private defaultChromiumArgs: string[] = [
    '--disable-infobars',
    '--no-default-browser-check',
    `--load-extension=${path.join(findRoot(__dirname), 'extensions', 'theme')}`,
    `--homepage=file://${path.join(findRoot(__dirname), 'pages', 'homepage', 'index.html')}`,
    `file://${path.join(findRoot(__dirname), 'pages', 'homepage', 'index.html')}`,
  ];

  private launchOptions: PuppeteerLaunchOptions = {
    devtools: defaultArguments.devtools,
    timeout: defaultArguments.timeout,
    ignoreDefaultArgs: ['--enable-automation', '--disable-extensions'],
  };

  constructor(config: Arguments = defaultArguments) {
    super();
    this.log.debug('contructing Hackium instance');
    if (config) this.config = Object.assign({}, this.config, config);
    this.log.debug('Using config:');
    this.log.debug(this.config);

    this.log.debug('running preInit on %o plugins', this.config.plugins.length);
    this.config.plugins.forEach((plugin) => plugin.preInit && plugin.preInit(this, this.config));

    HackiumPage.hijackCreate({
      interceptorFiles: this.config.interceptor,
      injectionFiles: this.config.inject,
      pwd: this.config.pwd,
      watch: this.config.watch,
    });

    if ('devtools' in this.config) {
      this.launchOptions.devtools = this.config.devtools;
    }
    if ('timeout' in this.config) {
      this.launchOptions.timeout = typeof this.config.timeout === 'string' ? parseInt(this.config.timeout) : this.config.timeout;
    }

    setEnv(this.config.env);
    setEnv(ENVIRONMENT);

    this.launchOptions.headless = this.config.headless;
    if (this.config.userDataDir) {
      this.launchOptions.userDataDir = this.config.userDataDir;
    }
    this.launchOptions.args = this.defaultChromiumArgs;
    if (this.config.chromeOutput) {
      this.launchOptions.dumpio = true;
      this.defaultChromiumArgs.push('--enable-logging=stderr', '--v=1');
    }

    this.log.debug('running postInit on %o plugins', this.config.plugins.length);
    this.config.plugins.forEach((plugin) => plugin.postInit && plugin.postInit(this, this.config));
  }

  getBrowser(): HackiumBrowser {
    if (!this.browser) throw new Error('Attempt to capture browser before initialized');
    return this.browser;
  }

  async launch(options: LaunchOptions = {}) {
    const launchOptions = mergeLaunchOptions(Object.assign(options, this.launchOptions));
    this.log.debug('running preLaunch on %o plugins', this.config.plugins.length);
    this.config.plugins.forEach((plugin) => plugin.preLaunch && plugin.preLaunch(this, launchOptions));

    const browser = ((await puppeteer.launch(launchOptions)) as unknown) as HackiumBrowser;

    this.log.debug('running postLaunch on %o plugins', this.config.plugins.length);
    this.config.plugins.forEach((plugin) => plugin.postLaunch && plugin.postLaunch(this, browser, launchOptions));

    await browser.onInitialization();

    this.log.debug('running postBrowserInit on %o plugins', this.config.plugins.length);
    this.config.plugins.forEach((plugin) => plugin.postBrowserInit && plugin.postBrowserInit(this, browser, launchOptions));

    return (this.browser = browser);
  }

  async cliBehavior() {
    const cliBehaviorLog = this.log.debug.extend('cli-behavior');
    cliBehaviorLog('running default cli behavior');
    cliBehaviorLog('launching browser');
    const browser = await this.launch();
    cliBehaviorLog('launched browser');
    const [page] = await browser.pages();
    if (this.config.url) {
      cliBehaviorLog(`navigating to ${this.config.url}`);
      await page.goto(this.config.url);
    }
    cliBehaviorLog(`running %o hackium scripts`, this.config.execute.length);
    await waterfallMap(this.config.execute, (file) => {
      return this.runScript(file).then((result) => console.log(result));
    });
    cliBehaviorLog(`core cli behavior complete`);
    return browser;
  }

  async runScript(file: string, args: any[] = [], src?: string) {
    const truePath = resolve([file], this.config.pwd);
    if (!src) {
      this.log.debug('reading in %o to run as a hackium script', truePath);
      src = await read([truePath]);
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
      require: createRequire(truePath),
      __dirname: path.dirname(truePath),
      __filename: truePath,
      args: this.config._,
      __rootResult: null,
    };
    vm.createContext(context);

    const wrappedSrc = `
    __rootResult = (async function hackiumScript(){${src}}())
    `;
    this.log.debug('running script %O', wrappedSrc);

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
    this.log.debug('closing browser');
    if (this.browser) {
      await this.browser.close();
      this.log.debug('closed browser');
    }
  }
}
