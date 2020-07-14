import { resolve } from '../../src/util/file';
import { expect } from 'chai';
import { SimulatedMovement, Vector } from '../../src/util/movement';
import path from 'path';

describe('movement', function () {
  it('first and last points should be at start and end', async () => {
    const from = new Vector(10, 10);
    const to = new Vector(900, 900);
    const points = new SimulatedMovement(4, 2, 5).generatePath(from, to);
    const first = points.shift() || [];
    const last = points.pop() || [];
    expect(first[0]).to.equal(from.x);
    expect(first[1]).to.equal(from.y);
    expect(last[0]).to.equal(to.x);
    expect(last[1]).to.equal(to.y);
  });
});
