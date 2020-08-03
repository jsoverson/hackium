export function merge(dest: any, ...others: any) {
  if (dest === undefined || dest === null) return dest;
  const newObject: any = {};
  for (let other of others) {
    const allKeys = Object.keys(dest).concat(Object.keys(other));
    for (let key of allKeys) {
      if (key in dest) {
        if (Array.isArray(dest[key])) {
          newObject[key] = [...dest[key]];
          if (key in other) {
            newObject[key].push(...other[key]);
          }
        } else if (typeof dest[key] === 'object') {
          if (key in other) newObject[key] = merge(dest[key], other[key]);
        } else {
          if (key in dest) newObject[key] = dest[key];
          if (key in other) newObject[key] = other[key];
        }
      } else if (key in other) {
        if (Array.isArray(other[key])) {
          newObject[key] = [...other[key]];
        } else if (typeof dest[key] === 'object') {
          newObject[key] = other[key];
        } else {
          newObject[key] = other[key];
        }
      }
    }
  }
  return newObject;
}
