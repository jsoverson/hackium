import { Hackium } from '..';
import { Arguments, ArgumentsWithDefaults } from '../arguments';
import { HackiumBrowser } from '../hackium/hackium-browser';
import { LaunchOptions, ChromeArgOptions, BrowserOptions } from 'puppeteer/lib/cjs/puppeteer/node/LaunchOptions';

export interface Constructor<T> {
  new (...args: any): T;
}

export interface Plugin {
  preInit?: (hackium: Hackium, options: ArgumentsWithDefaults) => void;
  postInit?: (hackium: Hackium, finalOptions: ArgumentsWithDefaults) => void;
  preLaunch?: (hackium: Hackium, launchOptions: PuppeteerLaunchOptions) => void;
  postLaunch?: (hackium: Hackium, browser: HackiumBrowser, finalLaunchOptions: PuppeteerLaunchOptions) => void;
  postBrowserInit?: (hackium: Hackium, browser: HackiumBrowser, finalLaunchOptions: PuppeteerLaunchOptions) => void;
}

export type PuppeteerLaunchOptions = LaunchOptions & ChromeArgOptions & BrowserOptions;
