import { expect } from 'chai';
import fs from 'fs';

import { start, stop } from './server';

import Hackium from '../src';
import findRoot from 'find-root';
import path from 'path';

const fsp = fs.promises;

const port = 5000;
let baseUrl = `http://127.0.0.1:${port}/`;

describe('Hackium', function () {
  this.timeout(60000);
  let userDataDir = '/nonexistant';

  // before((done) => {
  //   userDataDir = '/tmp/randomDir' + Math.random();
  //   start(port, done);
  // });

  // after((done) => {
  //   console.log('removing userdatadir...');
  //   fsp.rmdir(userDataDir, { recursive: true }).then(() => {
  //     console.log('...removed userdatadir');
  //     stop((_) => hackium.close().then(done));
  //   });
  // });

  it('Should insantiate with no arguments', async () => {
    const hackium = new Hackium();
    expect(hackium).to.be.instanceOf(Hackium);
  });

  it('Should propagate version', async () => {
    const hackium = new Hackium();
    const pkg = require(path.join(findRoot(__dirname), 'package.json'));
    expect(hackium.version).to.equal(pkg.version);
  });

});
