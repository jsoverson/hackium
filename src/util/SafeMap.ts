import assert from 'assert';

export class SafeMap<K, V> extends Map<K, V> {
  get(key: K): V {
    assert(this.has(key), `SafeMap key ${key} not found in ${this}`);
    const value = super.get(key);
    if (value === undefined || value === null) throw new Error(`SafeMap value for key ${key} is null or undefined.`);
    return value;
  }
}
