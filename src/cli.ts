#!/usr/bin/env node --experimental-repl-await

import path from 'path';
import Hackium from './';
import { Arguments, definition } from './arguments';
import repl from 'repl';

import yargs = require('yargs');

import Logger from './logger';

const log = new Logger('hackium:cli');

const DEFAULT_CONFIG_NAMES = ['hackium.json', 'hackium.config.js'];

const argParser = yargs
  .commandDir('cmds')
  .command('$0', 'start hackium', (yargs) => {
    yargs
      .options(definition)
      .option('config', {
        alias: 'c',
        default: '',
        type: 'string',
      })
  }, (argv) => {
    main(argv);
  })
  .help();

const args = argParser.argv;

async function main(config: Arguments) {
  const configFilesToCheck = [...DEFAULT_CONFIG_NAMES];

  if (config.config) configFilesToCheck.unshift(config.config);

  for (let i = 0; i < configFilesToCheck.length; i++) {
    const fileName = configFilesToCheck[i];
    const location = path.join(process.env.PWD || '', fileName);
    try {
      config = await import(location);
      log.info(`Using config found at ${location}`);
      config.pwd = path.dirname(location);
      log.debug(`setting pwd to config dir: ${path.dirname(location)}`);
      break;
    } catch {
      log.debug(`No config found at ${location}`);
    }
  }

  const hackium = new Hackium(config);

  hackium
    .cliBehavior()
    .then(() => {
      log.info('Hackium launched');
    })
    .catch((e) => {
      log.error('Hackium failed during bootup and may be in an unstable state.');
      log.error(e);
    })
    .finally(async () => {
      const browser = await hackium.getBrowser();

      const replInstance = repl.start('> ');
      replInstance.context.hackium = hackium;
      replInstance.context.browser = browser;
      replInstance.context.cdp = browser.connection;
      replInstance.context.extensionBridge = browser.extension;
      replInstance.on('exit', () => {
        browser.close();
      });
      hackium.getBrowser().on('disconnected', () => {
        replInstance.close();
      });
    })
    .catch((err) => {
      log.error(err);
    });
}
