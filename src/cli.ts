import origFs from 'fs';
import path from 'path';
import { Page } from 'puppeteer/lib/Page';
import repl from 'repl';
import { promisify } from 'util';
import Hackium from './';
import { Arguments, definition } from './arguments';
import { HackiumBrowserEmittedEvents } from './hackium/hackium-browser';
import Logger from './util/logger';

import yargs = require('yargs');
import { resolve } from './util/file';
import { Readable, Writable } from 'stream';

const log = new Logger('hackium:cli');
const exists = promisify(origFs.exists);

const DEFAULT_CONFIG_NAMES = ['hackium.json', 'hackium.config.js'];

export default function runCli() {
  const argParser = yargs
    .commandDir('cmds')
    .command(
      '$0',
      'start hackium',
      (yargs) => {
        yargs.options(definition).option('config', {
          alias: 'c',
          default: '',
          type: 'string',
        });
      },
      (argv) => {
        _runCli(argv);
      },
    )
    .help();

  const args = argParser.argv;
  log.debug('parsed command line args into : %O', args);
}

export interface ReplOptions {
  stdout?: Writable;
  stdin?: Readable;
}

export async function _runCli(config: Arguments, replOptions: ReplOptions = {}) {
  const configFilesToCheck = [...DEFAULT_CONFIG_NAMES];

  if (config.config) configFilesToCheck.unshift(config.config);

  for (let i = 0; i < configFilesToCheck.length; i++) {
    const fileName = configFilesToCheck[i];
    const location = path.join(process.env.PWD || '', fileName);
    if (!(await exists(location))) {
      log.debug(`no config found at ${location}`);
      continue;
    }
    try {
      config = require(location);
      log.info(`using config found at ${location}`);
      config.pwd = path.dirname(location);
      log.debug(`setting pwd to config dir: ${path.dirname(location)}`);
      break;
    } catch (e) {
      log.error(`error importing configuration:`);
      console.log(e);
    }
  }

  const hackium = new Hackium(config);

  return hackium
    .cliBehavior()
    .then(() => {
      log.info('Hackium launched');
    })
    .catch((e) => {
      log.error('Hackium failed during bootup and may be in an unstable state.');
      log.error(e);
    })
    .then(async () => {
      log.debug('starting repl');
      const browser = await hackium.getBrowser();
      const replInstance = repl.start({
        prompt: '> ',
        output: replOptions.stdout || process.stdout,
        input: replOptions.stdin || process.stdin,
      });
      log.debug('repl started');
      if (config.pwd) {
        const setupHistory = promisify(replInstance.setupHistory.bind(replInstance));
        const replHistoryPath = resolve(['.repl_history'], config.pwd);
        log.debug('saving repl history at %o', replHistoryPath);
        await setupHistory(replHistoryPath);
      } else {
        log.debug('pwd not set, repl history can not be saved');
      }

      replInstance.context.hackium = hackium;
      replInstance.context.browser = browser;
      replInstance.context.cdp = browser.connection;
      replInstance.context.extensionBridge = browser.extension;
      replInstance.context.page = browser.activePage;
      browser.on(HackiumBrowserEmittedEvents.ActivePageChanged, (page: Page) => {
        log.debug('active page changed');
        replInstance.context.page = page;
      });
      replInstance.on('exit', () => {
        log.debug('repl exited, closing browser');
        browser.close();
      });
      hackium.getBrowser().on('disconnected', () => {
        log.debug('browser disconnected, closing repl');
        replInstance.close();
      });
      log.debug('repl setup complete');
      return {
        repl: replInstance,
      };
    });
}
