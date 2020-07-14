import yargs from 'yargs';
import DEBUG from 'debug';

export const debug = DEBUG('hackium:test');

import { definition, Arguments } from '../src/arguments';

export function getArgs(argv: string): Arguments {
  debug('simulating arguments %o', argv);
  const y = yargs.options(definition);
  const parsed = y.parse(argv);
  debug('parsed arguments as %O', parsed);
  return parsed;
}
