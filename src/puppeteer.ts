import { Puppeteer } from 'puppeteer/lib/Puppeteer';
import findRoot from 'find-root';
import path from 'path';

import { initializePuppeteer } from 'puppeteer/lib/index';

const puppeteer = initializePuppeteer({
  packageJson: require(path.join(findRoot(require.resolve('puppeteer')), 'package.json')),
  rootDirectory: findRoot(require.resolve('puppeteer')),
});

export default puppeteer as Puppeteer;
