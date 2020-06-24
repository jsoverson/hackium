
const { parseScript } = require('shift-parser');
import { prettyPrint } from 'shift-printer';

export function prettify(src: string) {
  return prettyPrint(parseScript(src));
}