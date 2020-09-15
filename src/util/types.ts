import { Hackium } from '..';
import { Arguments, ArgumentsWithDefaults } from '../arguments';
import { HackiumBrowser } from '../hackium/hackium-browser';
import { LaunchOptions, ChromeArgOptions, BrowserOptions } from 'puppeteer/lib/cjs/puppeteer/node/LaunchOptions';
import { HackiumPage } from '../hackium/hackium-page';

export interface Constructor<T> {
  new (...args: any): T;
}

export interface Plugin {
  preInit?: (hackium: Hackium, options: ArgumentsWithDefaults) => any;
  postInit?: (hackium: Hackium, finalOptions: ArgumentsWithDefaults) => any;
  preLaunch?: (hackium: Hackium, launchOptions: PuppeteerLaunchOptions) => any;
  postLaunch?: (hackium: Hackium, browser: HackiumBrowser, finalLaunchOptions: PuppeteerLaunchOptions) => any;
  postBrowserInit?: (hackium: Hackium, browser: HackiumBrowser, finalLaunchOptions: PuppeteerLaunchOptions) => any;
  prePageCreate?: (browser: HackiumBrowser) => any;
  postPageCreate?: (browser: HackiumBrowser, page: HackiumPage) => any;
}

export type PuppeteerLaunchOptions = LaunchOptions & ChromeArgOptions & BrowserOptions;
