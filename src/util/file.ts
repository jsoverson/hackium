import path from 'path';
import { promises as fs } from 'fs';
import chokidar from 'chokidar';
import DEBUG from 'debug';
import os from 'os';
import { handler } from '../cmds/init';

const debug = DEBUG('hackium:file');

class Watcher {
  _watcher = chokidar.watch([], {});
  handlers = new Map<string, Function[]>();
  constructor() {
    this._watcher.on('change', (file) => {
      debug('file %o changed', file);
      const handlers = this.handlers.get(file);
      if (!handlers) {
        debug('no change handlers set for %o', file);
        return;
      }
      handlers.forEach((handler) => handler(file));
    });
  }
  add(file: string, callback: Function) {
    this._watcher.add(file);
    const existingHandlers = this.handlers.get(file);
    if (existingHandlers) {
      existingHandlers.push(callback);
    } else {
      this.handlers.set(file, [callback]);
    }
  }
}

const watcher = new Watcher();

export function resolve(parts: string[], pwd = ''): string {
  const joinedPath = path.join(...parts);
  const parsed = path.parse(joinedPath);
  if (!parsed.root) {
    if (pwd) {
      return path.resolve(path.join(pwd, ...parts));
    } else {
      throw new Error(`Path ${joinedPath} has no root and no pwd passed.`);
    }
  } else {
    return path.resolve(joinedPath);
  }
}

export function watch(file: string, callback: Function) {
  debug('watching %o', file);
  watcher.add(file, callback);
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

export async function getRandomDir(prefix = 'hackium -') {
  const dir = fs.mkdtemp(path.join(os.tmpdir(), 'prefix'));
  debug('created random directory %o', dir);
  return dir;
}
