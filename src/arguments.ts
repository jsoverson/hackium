import path from 'path';

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
  chromeOutput?: boolean;
  timeout?: number | string;
  // userAgent?: string;
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
  devtools = true;
  watch = false;
  execute: string[] = [];
  chromeOutput = false;
  // userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.0 Safari/537.36';
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
