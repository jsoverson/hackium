import yargs from 'yargs';

import { definition, Arguments } from '../src/arguments';

export function getArgs(argv: string): Arguments {
  const y = yargs.options(definition);
  const parsed = y.parse(argv);
  return parsed;
}
