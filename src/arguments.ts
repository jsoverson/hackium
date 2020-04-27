export interface Arguments {
  url: string;
  adblock: boolean;
  env: string[];
  config?: string;
  inject?: string[];
  intercept?: string[];
  interceptor?: string;
  pwd: string;
  headless: boolean;
}

export const definition = {
  headless: {
    describe: 'start hackium in headless mode',
    boolean: true,
    default: false,
  },
  pwd: {
    describe: 'root directory to look for support modules',
    default: process.cwd(),
  },
  adblock: {
    describe: 'turn on ad blocker',
    default: false,
    demandOption: false,
  },
  url: {
    alias: 'u',
    describe: 'starting URL',
    default: 'https://example.com',
    demandOption: true,
  },
  env: {
    array: true,
    describe: 'environment variable name/value pairs (e.g. --env MYVAR=value)',
    default: [] as string[],
  },
  inject: {
    alias: 'e',
    array: true,
    describe: 'script file to inject first on every page',
    default: [] as string[],
  },
  intercept: {
    alias: 'i',
    array: true,
    describe: 'url patterns to intercept',
    default: [] as string[],
  },
  interceptor: {
    alias: 'I',
    string: true,
    describe: 'interceptor module that will handle intercepted responses',
    default: '',
  },
};
