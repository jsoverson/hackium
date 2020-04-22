import { Arguments } from './arguments';

class Lib {
  inputFile: string;

  constructor(args: Arguments) {
    this.inputFile = args.file;
  }
  run() {
    console.log(`Looking good! Passed ${this.inputFile}`);
  }
}

export default Lib;
