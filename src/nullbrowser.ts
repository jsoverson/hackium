import { Browser } from "puppeteer";

export class NullBrowser implements Browser {
  on<K extends "disconnected" | "targetchanged" | "targetcreated" | "targetdestroyed">(eventName: K, handler: (e: import("puppeteer").BrowserEventObj[K], ...args: any[]) => void): this {
    throw new Error("Browser not initialized");
  }
  once<K extends "disconnected" | "targetchanged" | "targetcreated" | "targetdestroyed">(eventName: K, handler: (e: import("puppeteer").BrowserEventObj[K], ...args: any[]) => void): this {
    throw new Error("Browser not initialized");
  }
  browserContexts(): import("puppeteer").BrowserContext[] {
    throw new Error("Browser not initialized");
  }
  close(): Promise<void> {
    throw new Error("Browser not initialized");
  }
  createIncognitoBrowserContext(): Promise<import("puppeteer").BrowserContext> {
    throw new Error("Browser not initialized");
  }
  disconnect(): void {
    throw new Error("Browser not initialized");
  }
  isConnected(): boolean {
    throw new Error("Browser not initialized");
  }
  defaultBrowserContext(): import("puppeteer").BrowserContext {
    throw new Error("Browser not initialized");
  }
  newPage(): Promise<import("puppeteer").Page> {
    throw new Error("Browser not initialized");
  }
  pages(): Promise<import("puppeteer").Page[]> {
    throw new Error("Browser not initialized");
  }
  process(): import("child_process").ChildProcess {
    throw new Error("Browser not initialized");
  }
  target(): import("puppeteer").Target {
    throw new Error("Browser not initialized");
  }
  targets(): Promise<import("puppeteer").Target[]> {
    throw new Error("Browser not initialized");
  }
  userAgent(): Promise<string> {
    throw new Error("Browser not initialized");
  }
  version(): Promise<string> {
    throw new Error("Browser not initialized");
  }
  wsEndpoint(): string {
    throw new Error("Browser not initialized");
  }
  addListener(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error("Browser not initialized");
  }
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error("Browser not initialized");
  }
  off(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error("Browser not initialized");
  }
  removeAllListeners(event?: string | symbol | undefined): this {
    throw new Error("Browser not initialized");
  }
  setMaxListeners(n: number): this {
    throw new Error("Browser not initialized");
  }
  getMaxListeners(): number {
    throw new Error("Browser not initialized");
  }
  listeners(event: string | symbol): Function[] {
    throw new Error("Browser not initialized");
  }
  rawListeners(event: string | symbol): Function[] {
    throw new Error("Browser not initialized");
  }
  emit(event: string | symbol, ...args: any[]): boolean {
    throw new Error("Browser not initialized");
  }
  listenerCount(type: string | symbol): number {
    throw new Error("Browser not initialized");
  }
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error("Browser not initialized");
  }
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error("Browser not initialized");
  }
  eventNames(): (string | symbol)[] {
    throw new Error("Browser not initialized");
  }
  waitForTarget(predicate: (target: import("puppeteer").Target) => boolean, options?: import("puppeteer").Timeoutable | undefined): Promise<import("puppeteer").Target> {
    throw new Error("Browser not initialized");
  }
  
}

