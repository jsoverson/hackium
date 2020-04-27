import { CDPSession } from 'puppeteer';

export class NullCDPSession implements CDPSession {
  detach(): Promise<void> {
    throw new Error('CDPSession not initialized.');
  }
  send(method: string, params?: object | undefined): Promise<object> {
    throw new Error('CDPSession not initialized.');
  }
  addListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    throw new Error('CDPSession not initialized.');
  }
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error('CDPSession not initialized.');
  }
  once(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error('CDPSession not initialized.');
  }
  removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    throw new Error('CDPSession not initialized.');
  }
  off(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error('CDPSession not initialized.');
  }
  removeAllListeners(event?: string | symbol | undefined): this {
    throw new Error('CDPSession not initialized.');
  }
  setMaxListeners(n: number): this {
    throw new Error('CDPSession not initialized.');
  }
  getMaxListeners(): number {
    throw new Error('CDPSession not initialized.');
  }
  listeners(event: string | symbol): Function[] {
    throw new Error('CDPSession not initialized.');
  }
  rawListeners(event: string | symbol): Function[] {
    throw new Error('CDPSession not initialized.');
  }
  emit(event: string | symbol, ...args: any[]): boolean {
    throw new Error('CDPSession not initialized.');
  }
  listenerCount(type: string | symbol): number {
    throw new Error('CDPSession not initialized.');
  }
  prependListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    throw new Error('CDPSession not initialized.');
  }
  prependOnceListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    throw new Error('CDPSession not initialized.');
  }
  eventNames(): (string | symbol)[] {
    throw new Error('CDPSession not initialized.');
  }
}
