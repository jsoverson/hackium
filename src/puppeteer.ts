import { Puppeteer } from 'puppeteer/lib/cjs/puppeteer/common/Puppeteer';
import { initializePuppeteer } from 'puppeteer/lib/cjs/puppeteer/initialize';

const puppeteer = initializePuppeteer('puppeteer');

export default puppeteer as Puppeteer;
