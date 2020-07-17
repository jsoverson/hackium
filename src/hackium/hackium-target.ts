import { Target } from 'puppeteer/lib/cjs/common/Target';
import { BrowserContext } from 'puppeteer/lib/cjs/common/Browser';
import Protocol from 'devtools-protocol';
import { CDPSession } from 'puppeteer/lib/cjs/common/Connection';
import { Viewport } from 'puppeteer/lib/cjs/common/PuppeteerViewport';
import { HackiumPage } from './hackium-page';
import Hackium from '..';
import Logger from '../util/logger';
import { EventEmitter } from 'puppeteer/lib/cjs/common/EventEmitter';
import { mixin } from '../util/mixin';
import { HackiumBrowserContext } from './hackium-browser-context';

export interface HackiumTarget extends Target, EventEmitter {}

export const enum TargetEmittedEvents {
  TargetInfoChanged = 'targetInfoChanged',
}

export class HackiumTarget extends Target {
  log = new Logger('hackium:target');

  constructor(
    targetInfo: Protocol.Target.TargetInfo,
    browserContext: HackiumBrowserContext,
    sessionFactory: () => Promise<CDPSession>,
    ignoreHTTPSErrors: boolean,
    defaultViewport: Viewport | null,
  ) {
    super(targetInfo, browserContext, sessionFactory, ignoreHTTPSErrors, defaultViewport);
    mixin(this, new EventEmitter());
    this.log.debug('Constructed new target');
  }

  async page(): Promise<HackiumPage> {
    return super.page() as Promise<HackiumPage>;
  }

  _targetInfoChanged(targetInfo: Protocol.Target.TargetInfo): void {
    super._targetInfoChanged(targetInfo);
    this.emit(TargetEmittedEvents.TargetInfoChanged, targetInfo);
  }
}
