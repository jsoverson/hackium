import { promisify } from "util";
import origFs, { promises as fs } from 'fs';
import path from "path";
import findRoot from "find-root";

const exists = promisify(origFs.exists);

export async function safelyWrite(file: string, contents: string) {
  if (await exists(file)) throw new Error(`Refusing to overwrite ${file}`);
  return fs.writeFile(file, contents, 'utf-8');
}

export function readTemplate(name: string) {
  return fs.readFile(path.join(findRoot(__dirname), 'src', 'cmds', 'init', 'templates', name), 'utf-8');
}

export async function writeTemplate(name: string, to?: string) {
  await safelyWrite(to || name, await readTemplate(name));
  return name;
}