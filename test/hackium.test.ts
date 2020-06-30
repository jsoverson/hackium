import { expect } from 'chai';
import findRoot from 'find-root';
import path from 'path';
import Hackium from '../src';

describe('Hackium', function () {

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
