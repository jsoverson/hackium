export interface Arguments {
  file: string;
}

export const definition = {
  file: {
    alias: 'f',
    describe: 'input file',
    default: '',
    demandOption: true,
  },
};
