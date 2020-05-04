import path from 'path';


export class Arguments {
  url: string = 'https://example.com/';
  adblock: boolean = false;
  env: string[] = [];
  config?: string = '';
  inject?: string[] = [];
  intercept?: string[] = [];
  interceptor?: string = '';
  pwd: string = process.cwd();
  headless: boolean = false;
  userDataDir: string = path.join(process.env.HOME || process.cwd(), '.hackium', 'chromium');
  devtools: boolean = true;
  watch: boolean = false;
}

export const defaultArguments = new Arguments();

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
    alias: 'e',
    array: true,
    describe: 'script file to inject first on every page',
    default: defaultArguments.inject,
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
    default: defaultArguments.userDataDir
  },
  devtools: {
    alias: 'd',
    describe: 'open devtools automatically on every tab',
    boolean: true,
    default: defaultArguments.devtools
  },
  watch: {
    alias: 'w',
    describe: 'watch for configuration changes',
    boolean: true,
    default: defaultArguments.watch,
  }
};
