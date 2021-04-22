import { initializePuppeteerNode } from 'puppeteer/lib/cjs/puppeteer/initialize-node';
import { PuppeteerNode } from 'puppeteer/lib/cjs/puppeteer/node/Puppeteer';

const puppeteer = initializePuppeteerNode('puppeteer');

export default puppeteer as PuppeteerNode;
