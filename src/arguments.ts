import path from 'path';
import { Plugin } from './util/types';

export const defaultSignal = '<default>';

export class Arguments {
  url?: string;
  adblock?: boolean;
  env?: string[];
  config?: string;
  inject?: string[];
  interceptor?: string[];
  pwd?: string;
  headless?: boolean;
  userDataDir?: string;
  devtools?: boolean;
  watch?: boolean;
  execute?: string[];
  plugins?: Plugin[];
  chromeOutput?: boolean;
  timeout?: number | string;
  _?: any[];
}

export class ArgumentsWithDefaults extends Arguments {
  url?: string = undefined;
  adblock = false;
  env: string[] = [];
  config = '';
  inject: string[] = [];
  interceptor: string[] = [];
  pwd = process.cwd();
  headless = false;
  userDataDir = path.join(process.env.HOME || process.cwd(), '.hackium', 'chromium');
  timeout = 30000;
  devtools = false;
  watch = false;
  execute: string[] = [];
  plugins: Plugin[] = [];
  chromeOutput = false;
  _: string[] = [];
}

export const defaultArguments = new ArgumentsWithDefaults();

export const definition = {
  headless: {
    describe: 'start hackium in headless mode',
    boolean: true,
    default: defaultArguments.headless,
  },
  pwd: {
    describe: 'root directory to look for support modules',
    default: defaultArguments.pwd,
  },
  adblock: {
    describe: 'turn on ad blocker',
    default: defaultArguments.adblock,
    // demandOption: false,
  },
  url: {
    alias: 'u',
    describe: 'starting URL',
    default: defaultArguments.url,
    // demandOption: true,
  },
  env: {
    array: true,
    describe: 'environment variable name/value pairs (e.g. --env MYVAR=value)',
    default: defaultArguments.env,
  },
  inject: {
    alias: 'I',
    array: true,
    describe: 'script file to inject first on every page',
    default: defaultArguments.inject,
  },
  execute: {
    alias: 'e',
    array: true,
    describe: 'hackium script to execute',
    default: defaultArguments.execute,
  },
  interceptor: {
    alias: 'i',
    array: true,
    describe: 'interceptor module that will handle intercepted responses',
    default: defaultArguments.interceptor,
  },
  userDataDir: {
    alias: 'U',
    describe: 'Chromium user data directory',
    string: true,
    default: defaultArguments.userDataDir,
  },
  devtools: {
    alias: 'd',
    describe: 'open devtools automatically on every tab',
    boolean: true,
    default: defaultArguments.devtools,
  },
  watch: {
    alias: 'w',
    describe: 'watch for configuration changes',
    boolean: true,
    default: defaultArguments.watch,
  },
  plugin: {
    alias: 'p',
    describe: 'include plugin',
    array: true,
    default: defaultArguments.plugins,
  },
  timeout: {
    alias: 't',
    describe: 'set timeout for Puppeteer',
    default: defaultArguments.timeout,
  },
  chromeOutput: {
    describe: 'print Chrome stderr & stdout logging',
    boolean: true,
    default: defaultArguments.chromeOutput,
  },
};
