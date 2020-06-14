import { Page, Target } from "puppeteer";
import { HackiumPage, PageInstrumentationConfig } from "./hackium-page";
import DEBUG from 'debug';

const debug = DEBUG('hackium:prepare');

const { Page: PuppeteerPage } = require('puppeteer/lib/Page.js');
const { Target: PuppeteerTarget } = require('puppeteer/lib/Target.js');

export interface OverrideConfig {
  page?: PageInstrumentationConfig
}

declare module 'puppeteer' {
  export class Page {
    static __instrumented: boolean;
  }
  export class Target {
    static __instrumented: boolean;
  }
}

export function overridePuppeteerMethods(config: OverrideConfig) {
  if (!PuppeteerPage.__instrumented)
    PuppeteerPage.__instrumented = overridePage(config.page);
  if (!PuppeteerTarget.__instrumented)
    PuppeteerTarget.__instrumented = overrideTarget();
}

export function resetOverriddenPuppeteerMethods() {
  resetPage();
  resetTarget();
}

function overridePage(config?: PageInstrumentationConfig) {
  debug('overriding Page methods');

  PuppeteerPage._origCreate = PuppeteerPage.create;

  PuppeteerPage.create = async function create(...args: any): Promise<Page> {
    const page = await PuppeteerPage._origCreate(...args);
    const hackiumPage = new HackiumPage();
    const props = Object.getOwnPropertyDescriptors(HackiumPage.prototype);
    Object.assign(page, hackiumPage);
    Object
      .entries(props)
      .filter(([prop]) => prop !== 'constructor')
      .forEach(([prop, descriptor]) => {
        Object.defineProperty(page, prop, descriptor)
      });
    await page.instrumentSelf(config);
    return page;
  }

  return true;
}

function resetPage() {
  debug('resetting Page methods');
  if (PuppeteerPage._origCreate) {
    PuppeteerPage.create = PuppeteerPage._origCreate;
    delete PuppeteerPage._origCreate
  }
  PuppeteerPage.__instrumented = false;
}

function resetTarget() {
  debug('resetting Target methods');
  if (PuppeteerTarget.prototype.origBrowser) {
    PuppeteerTarget.prototype.browser = PuppeteerTarget.prototype.origBrowser;
    delete PuppeteerTarget.prototype.origBrowser;
  }
  PuppeteerTarget.__instrumented = false;
}

function overrideTarget() {
  debug('overriding Target methods');
  PuppeteerTarget.prototype.origBrowser = PuppeteerTarget.prototype.browser;

  PuppeteerTarget.prototype.browser = function () {
    const browser = PuppeteerTarget.prototype.origBrowser.call(this);
    return browser.hackium;
  }

  return true;
}