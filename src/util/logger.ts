import DEBUG, { Debugger } from 'debug';
import chalk from 'chalk';

export default class Logger {
  debug: Debugger;

  constructor(name: string) {
    this.debug = DEBUG(name);
  }
  format(...args: any) {
    let index = 0;
    if (!args[0]) return '';
    args[0] = args[0].replace(/%([a-zA-Z%])/g, (match: string, format: string) => {
      if (match === '%%') return '%';
      index++;
      const formatter = DEBUG.formatters[format];
      if (typeof formatter === 'function') {
        const val = args[index];
        match = formatter.call(this.debug, val);
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    return args[0] || '';
  }
  print(...args: any) {
    console.log(...args);
  }
  info(...args: any) {
    console.log(chalk.cyan('Info: ') + this.format(...args));
  }
  warn(...args: any) {
    console.log(chalk.yellow('Warning: ') + this.format(...args));
  }
  error(...args: any) {
    console.log(chalk.red('Error: ') + this.format(...args));
  }
}
