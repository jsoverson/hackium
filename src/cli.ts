#!/usr/bin/env node --experimental-repl-await

import path from 'path';
import Hackium from './';
import { Arguments, definition } from './arguments';
import repl from 'repl';

import yargs = require('yargs');

import Logger from './logger';

const log = new Logger('hackium:cli');

const DEFAULT_CONFIG_NAMES = [
  'hackium.json',
  'hackium.config.js',
];

const argParser = yargs
  .options(definition)
  .option('config', {
    alias: 'c',
    default: '',
    type: 'string',
  })
  .help();

const args = argParser.argv;

main(args);

async function main(config: Arguments) {
  const configFilesToCheck = [...DEFAULT_CONFIG_NAMES]

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

  const instance = new Hackium(config);

  instance.cliBehavior().then(() => {
    log.info('Hackium launched');

    const replInstance = repl.start('> ');
    replInstance.context.hackium = instance;
    replInstance.context.cdp = instance.connection;
    replInstance.on('exit', () => {
      log.info('REPL exited. Press ^C to quit Hackium');
    })

  }).catch(err => {
    log.error(err);
  });
}

