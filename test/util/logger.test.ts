import { expect } from 'chai';
import Logger from '../../src/util/logger';

describe('logger', function () {
  it('should format log, warn, and error like debug', async () => {
    const logger = new Logger('test');
    const warn = logger.format('warn %o', 'foo');
    const error = logger.format('error %o', 100);
    expect(warn).to.match(/'foo'/);
    expect(error).to.match(/100/);
  });
});
