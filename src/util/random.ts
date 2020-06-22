import seedrandom from 'seedrandom';

export class Random {
  seed: number;
  rng: seedrandom.prng;

  static rng = new Random(0);

  static seedSingleton(seed: number) {
    Random.rng = new Random(seed);
  }

  constructor(seed?: number) {
    if (!seed) seed = seedrandom().int32();
    this.seed = seed;
    this.rng = seedrandom(seed.toString());
  }

  int(min = 0, max = Number.MAX_SAFE_INTEGER) {
    return Math.floor(this.rng() * (max - min)) + min;
  }

  oddInt(min = 0, max = Number.MAX_SAFE_INTEGER) {
    min = min % 2 === 0 ? min + 1 : min;
    max = max % 2 === 0 ? max - 1 : max;
    const delta = max - min;
    const rand = this.int(0, delta / 2);
    return min + rand * 2;
  }

  float(min = 0, max = 1) {
    return this.rng() * max - min;
  }

  decision(probability: number, decision: () => void) {
    if (this.float() < probability) decision();
  }

  listItem<T>(list: T[]): T {
    return list[this.int(0, list.length)];
  }

  oneIn(num: number) {
    return this.float() < 1 / num;
  }

}