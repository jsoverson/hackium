import DEBUG from 'debug';
import yargs from 'yargs';
import { Arguments, definition } from '../src/arguments';
export const debug = DEBUG('hackium:test');

export function getArgs(argv: string): Arguments {
  debug('simulating arguments %o', argv);
  const y = yargs.options(definition);
  const parsed = y.parse(argv);
  debug('parsed arguments as %O', parsed);
  return parsed;
}
