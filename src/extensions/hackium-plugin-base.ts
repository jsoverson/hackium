import { PuppeteerExtraPlugin } from 'puppeteer-extra-plugin';
import Logger from '../logger';

export class HackiumPlugin extends PuppeteerExtraPlugin {
  protected config: any;
  log: Logger = new Logger(this.name);

  constructor(config: any) {
    super(config);
    this.config = config;
  }

  get name() {
    return 'default';
  }

  get debug() {
    return this.log.debug;
  }
}
