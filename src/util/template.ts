import findRoot from 'find-root';
import path from 'path';
import { strings } from '../strings';

const metadata = require(path.join(findRoot(__dirname), 'package.json'));

export function renderTemplate(src: string) {
  return src.replace('%%%HACKIUM_VERSION%%%', metadata.version).replace(/%%%(.+?)%%%/g, (m, $1) => {
    return strings.get($1);
  });
}
