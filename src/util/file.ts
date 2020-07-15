import path from 'path';
import { promises as fs } from 'fs';
import chokidar from 'chokidar';
import DEBUG from 'debug';

const debug = DEBUG('hackium:file');

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

export function watch(file: string, callback: Function) {
  debug('watching %o', file);
  const watcher = chokidar.watch(file, {
    disableGlobbing: true,
  });
  watcher.on('change', () => {
    debug('file %o changed', file);
    callback(file);
  });
}

export function read(parts: string | string[], pwd = '') {
  const file = Array.isArray(parts) ? resolve(parts, pwd) : parts;
  debug('reading %o', file);
  return fs.readFile(file, 'utf-8');
}

export function write(parts: string | string[], contents: string, pwd = '') {
  const file = Array.isArray(parts) ? resolve(parts, pwd) : parts;
  debug('writing %o bytes to %o', contents.length, file);
  return fs.writeFile(file, contents);
}

export function remove(parts: string | string[], pwd = '') {
  const file = Array.isArray(parts) ? resolve(parts, pwd) : parts;
  debug('deleting %o', file);
  return fs.unlink(file);
}
