import path from 'path';
import { promises as fs } from 'fs';

export function resolve(parts: string[], pwd = ''): string {
  const joinedPath = path.join(...parts);
  const parsed = path.parse(joinedPath);
  if (!parsed.root) {
    if (pwd) {
      return path.join(pwd, ...parts);
    } else {
      throw new Error(`Path ${joinedPath} has no root and no pwd passed.`);
    }
  } else {
    return joinedPath;
  }
}

export function read(parts: string[], pwd = '') {
  return fs.readFile(resolve(parts, pwd), 'utf-8');
}
