import origFs from 'fs';
import path from 'path';
import { Page } from 'puppeteer/lib/cjs/puppeteer/common/Page';
import repl from 'repl';
import { Readable, Writable } from 'stream';
import { promisify } from 'util';
import { Hackium } from './';
import { Arguments, definition } from './arguments';
import { HackiumBrowserEmittedEvents } from './hackium/hackium-browser';
import { resolve } from './util/file';
import Logger from './util/logger';
import { merge } from './util/object';

import yargs = require('yargs');

const log = new Logger('hackium:cli');
const exists = promisify(origFs.exists);

const DEFAULT_CONFIG_NAMES = ['hackium.json', 'hackium.config.js'];

export default function runCli() {
  const argParser = yargs
    .commandDir('cmds')
    .command(
      '$0',
      'Default command: start hackium browser & REPL',
      (yargs) => {
        yargs.options(definition).option('config', {
          alias: 'c',
          default: '',
          type: 'string',
        });
      },
      (argv) => {
        if (argv.plugin) {
          argv.plugins = (argv.plugin as string[]).map((pluginPath) => {
            const plugin = require(path.resolve(pluginPath));
            return plugin && plugin.default ? plugin.default : plugin;
          });
        }
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

export async function _runCli(configFromCommandLine: Arguments, replOptions: ReplOptions = {}) {
  const configFilesToCheck = [...DEFAULT_CONFIG_NAMES];

  if (configFromCommandLine.config) configFilesToCheck.unshift(configFromCommandLine.config);

  let config = configFromCommandLine;

  for (let i = 0; i < configFilesToCheck.length; i++) {
    const fileName = configFilesToCheck[i];
    const location = path.join(process.env.PWD || '', fileName);
    if (!(await exists(location))) {
      log.debug(`no config found at ${location}`);
      continue;
    }
    try {
      const configFromFile = require(location);
      log.info(`using config found at ${location}`);
      configFromFile.pwd = path.dirname(location);
      log.debug(`setting pwd to config dir: ${path.dirname(location)}`);
      config = merge({}, configFromFile, configFromCommandLine);
      log.debug(`merged with command line arguments`);
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
      if (configFromCommandLine.pwd) {
        const setupHistory = promisify(replInstance.setupHistory.bind(replInstance));
        const replHistoryPath = resolve(['.repl_history'], configFromCommandLine.pwd);
        log.debug('saving repl history at %o', replHistoryPath);
        await setupHistory(replHistoryPath);
      } else {
        log.debug('pwd not set, repl history can not be saved');
      }

      replInstance.context.hackium = hackium;
      replInstance.context.browser = browser;
      replInstance.context.extension = browser.extension;
      const page = (replInstance.context.page = browser.activePage);
      if (page) {
        replInstance.context.cdp = await page.target().createCDPSession();
      }
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
