import { start, TestServer } from '@jsoverson/test-server';
import { expect } from 'chai';
import fs from 'fs';
import { Hackium } from '../../src';
import { getRandomDir } from '../../src/util/file';

const fsp = fs.promises;

describe('Browser context', function () {
  this.timeout(6000);
  let userDataDir = '/nonexistant';
  let hackium: Hackium;
  let server: TestServer;

  before(async () => {
    userDataDir = await getRandomDir();
    server = await start(__dirname, '..', '_server_root');
  });

  after(async () => {
    await fsp.rmdir(userDataDir, { recursive: true });
    await server.stop();
  });

  beforeEach(async () => {
    hackium = new Hackium();
  });

  afterEach(async () => {
    if (hackium) await hackium.close();
  });

  it('Should expose hackium object & version on the page', async () => {
    const browser = await hackium.launch();
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    await page.goto(server.url('index.html'));
    const version = await page.evaluate('hackium.version');
    expect(version).to.equal(require('../../package.json').version);
  });
});
