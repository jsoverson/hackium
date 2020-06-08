import path from 'path';

export class Arguments {
  url?: string;
  adblock?: boolean;
  env?: string[];
  config?: string;
  inject?: string[];
  intercept?: string[];
  interceptor?: string;
  pwd?: string;
  headless?: boolean;
  userDataDir?: string;
  devtools?: boolean;
  watch?: boolean;
  execute?: string[];
  _?: any[];
}

export class ArgumentsWithDefaults extends Arguments {
  url = 'about:blank';
  adblock = false;
  env = [];
  config = '';
  inject = [];
  intercept = [];
  interceptor = '';
  pwd = process.cwd();
  headless = false;
  userDataDir = path.join(
    process.env.HOME || process.cwd(),
    '.hackium',
    'chromium',
  );
  devtools = true;
  watch = false;
  execute = [];
  _ = [];
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
    demandOption: false,
  },
  url: {
    alias: 'u',
    describe: 'starting URL',
    default: defaultArguments.url,
    demandOption: true,
  },
  env: {
    array: true,
    describe: 'environment variable name/value pairs (e.g. --env MYVAR=value)',
    default: defaultArguments.env,
  },
  inject: {
    alias: 'E',
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
  intercept: {
    alias: 'i',
    array: true,
    describe: 'url patterns to intercept',
    default: defaultArguments.intercept,
  },
  interceptor: {
    alias: 'I',
    string: true,
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
};
