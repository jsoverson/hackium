
const { parseScript } = require('shift-ast');
import codegen from 'shift-printer';

export function prettify(src: string) {
  return codegen.print(parseScript(src));
}