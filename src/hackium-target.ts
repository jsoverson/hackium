
import { Target } from 'puppeteer/lib/Target';
import { BrowserContext } from 'puppeteer/lib/Browser';
import Protocol from 'puppeteer/lib/protocol';
import { CDPSession } from 'puppeteer/lib/Connection';
import { Viewport } from 'puppeteer/lib/PuppeteerViewport';
import { HackiumPage } from './hackium-page';
import Hackium from '.';
import Logger from './logger';
import { EventEmitter } from 'puppeteer/lib/EventEmitter';
import { mixin } from './mixin';

export interface HackiumTarget extends Target, EventEmitter { }

export const enum TargetEmittedEvents {
  TargetInfoChanged = 'targetInfoChanged',
}

export class HackiumTarget extends Target {
  log = new Logger('hackium:target');

  constructor(
    targetInfo: Protocol.Target.TargetInfo,
    browserContext: BrowserContext,
    sessionFactory: () => Promise<CDPSession>,
    ignoreHTTPSErrors: boolean,
    defaultViewport: Viewport | null
  ) {
    super(targetInfo, browserContext, sessionFactory, ignoreHTTPSErrors, defaultViewport);
    mixin(this, new EventEmitter());
    this.log.debug('Constructing new target');
  }

  async page(): Promise<HackiumPage> {
    return super.page() as Promise<HackiumPage>;
  }

  _targetInfoChanged(targetInfo: Protocol.Target.TargetInfo): void {
    super._targetInfoChanged(targetInfo);
    this.emit(TargetEmittedEvents.TargetInfoChanged, targetInfo);
  }

}

