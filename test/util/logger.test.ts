import { resolve, watch, remove, write, read } from '../../src/util/file';
import { expect } from 'chai';
import Logger from '../../src/util/logger';

describe('logger', function () {
  it('should format log, warn, and error like debug', async () => {
    const logger = new Logger('test');
    const info = logger.format('info %o', { a: 1 });
    const warn = logger.format('warn %o', 'foo');
    const error = logger.format('error %o', 100);
    expect(info).to.equal('info { a: \x1B[33m1\x1B[39m }');
    expect(warn).to.equal("warn \x1B[32m'foo'\x1B[39m");
    expect(error).to.equal('error \x1B[33m100\x1B[39m');
  });
});
