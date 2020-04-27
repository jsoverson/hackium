import DEBUG from 'debug';
import chalk from 'chalk';

export default class Logger {
  debug: (...args: any) => void;

  constructor(name: string) {
    this.debug = DEBUG(name);
  }
  print(...args: any) {
    console.log(...args);
  }
  info(...args: any) {
    console.log(chalk.cyan('Info: '), ...args);
  }
  warn(...args: any) {
    console.warn(chalk.yellow('Warning: '), ...args);
  }
  error(...args: any) {
    console.error(chalk.red('Error: '), ...args);
  }
}
