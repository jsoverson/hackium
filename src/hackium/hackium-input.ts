import { Keyboard, Mouse, MouseButton, MouseWheelOptions } from 'puppeteer/lib/cjs/puppeteer/common/Input';
import { ElementHandle } from 'puppeteer/lib/cjs/puppeteer/common/JSHandle';
import { Viewport } from 'puppeteer/lib/cjs/puppeteer/common/PuppeteerViewport';
import { keyDefinitions, KeyInput } from 'puppeteer/lib/cjs/puppeteer/common/USKeyboardLayout.js';
import Logger from '../util/logger';
import { SimulatedMovement, Vector } from '../util/movement';
import { waterfallMap } from '../util/promises';
import { Random } from '../util/random';
import { HackiumPage } from './hackium-page';
import { CDPSession } from 'puppeteer/lib/cjs/puppeteer/common/Connection';

export interface Point {
  x: number;
  y: number;
}

interface MouseOptions {
  button?: MouseButton;
  clickCount?: number;
}

export enum IdleMouseBehavior {
  MOVE,
  PAUSE,
}

export class HackiumMouse extends Mouse {
  log = new Logger('hackium:page:mouse');
  page: HackiumPage;
  rng = new Random();

  minDelay = 75;
  maxDelay = 500;
  minPause = 500;
  maxPause = 2000;

  __x = this.rng.int(1, 600);
  __y = this.rng.int(1, 600);
  __client: CDPSession;
  __button: MouseButton | 'none' = 'none';
  __keyboard: Keyboard;

  constructor(client: CDPSession, keyboard: Keyboard, page: HackiumPage) {
    super(client, keyboard);
    this.__x = this.rng.int(1, 600);
    this.__y = this.rng.int(1, 600);
    this.page = page;
    this.__client = client;
    this.__keyboard = keyboard;
  }

  get x() {
    return this.__x;
  }

  get y() {
    return this.__y;
  }

  async moveTo(selector: string | ElementHandle) {
    const elementHandle = typeof selector === 'string' ? await this.page.$(selector) : selector;
    if (!elementHandle) throw new Error(`Can not find bounding box of ${selector}`);
    const box = await elementHandle.boundingBox();
    if (!box) throw new Error(`${selector} has no bounding box to move to`);
    const x = this.rng.int(box.x, box.x + box.width);
    const y = this.rng.int(box.y, box.y + box.height);
    return this.move(x, y);
  }

  async click(x: number = this.x, y: number = this.y, options: MouseOptions & { delay?: number } = {}): Promise<void> {
    if (typeof x !== 'number' || typeof y !== 'number') {
      this.log.error('Mouse.click: x and y must be numbers');
      throw new Error('x & y must be numbers');
    }
    if (!options.delay) options.delay = this.rng.int(this.minDelay, this.maxDelay);
    await this.move(x, y);
    return super.click(x, y, options);
  }

  async idle(pattern: IdleMouseBehavior[] = [0, 1, 0, 0, 1]) {
    const viewport: Viewport = this.page.viewport() || { width: 800, height: 600 };
    return waterfallMap(pattern, async (movement) => {
      switch (movement) {
        case IdleMouseBehavior.MOVE:
          await this.move(this.rng.int(1, viewport.width), this.rng.int(1, viewport.height));
          break;
        case IdleMouseBehavior.PAUSE:
          await new Promise((f) => setTimeout(f, this.rng.int(this.minPause, this.maxPause)));
          break;
        default:
          throw new Error(`Invalid IdleMouseMovement value ${movement}`);
      }
    });
  }

  async down(options: MouseOptions = {}): Promise<void> {
    const { button = 'left', clickCount = 1 } = options;
    this.__button = button;
    await this.__client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      button,
      x: this.__x,
      y: this.__y,
      modifiers: this.__keyboard._modifiers,
      clickCount,
    });
  }

  async up(options: MouseOptions = {}): Promise<void> {
    const { button = 'left', clickCount = 1 } = options;
    this.__button = 'none';
    await this.__client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      button,
      x: this.__x,
      y: this.__y,
      modifiers: this.__keyboard._modifiers,
      clickCount,
    });
  }

  async wheel(options: MouseWheelOptions = {}): Promise<void> {
    const { deltaX = 0, deltaY = 0 } = options;
    await this.__client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: this.__x,
      y: this.__y,
      deltaX,
      deltaY,
      modifiers: this.__keyboard._modifiers,
      pointerType: 'mouse',
    });
  }

  async move(x: number, y: number, options: { steps?: number; duration?: number } = {}): Promise<void> {
    // steps are ignored and included for typing, duration is what matters to us.
    const { duration = Math.random() * 2000 } = options;

    const points = new SimulatedMovement(4, 2, 5).generatePath(new Vector(this.__x, this.__y), new Vector(x, y));

    const moves = waterfallMap(points, ([x, y]) =>
      this.__client
        .send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          button: this.__button,
          x,
          y,
          modifiers: this.__keyboard._modifiers,
        })
        .then(() => {
          this.__x = x;
          this.__y = y;
        }),
    );

    await moves;
  }
}

function charIsKey(char: string): char is KeyInput {
  //@ts-ignore
  return !!keyDefinitions[char];
}

export enum IdleKeyboardBehavior {
  PERUSE,
}

export class HackiumKeyboard extends Keyboard {
  minTypingDelay = 20;
  maxTypingDelay = 200;
  rng = new Random();

  async type(text: string, options: { delay?: number } = {}): Promise<void> {
    const delay = options.delay || this.maxTypingDelay;
    const randomDelay = () => this.rng.int(this.minTypingDelay, delay);
    for (const char of text) {
      if (charIsKey(char)) {
        await this.press(char, { delay: randomDelay() });
      } else {
        if (delay) await new Promise((f) => setTimeout(f, randomDelay()));
        await this.sendCharacter(char);
      }
    }
  }

  async idle(behaviors: IdleKeyboardBehavior[] = Array(10).fill(IdleKeyboardBehavior.PERUSE)) {
    const randomDelay = () => this.rng.int(this.minTypingDelay, this.maxTypingDelay);
    return waterfallMap(behaviors, async (behavior) => {
      switch (behavior) {
        case IdleKeyboardBehavior.PERUSE:
          await new Promise((f) => setTimeout(f, randomDelay()));
          switch (this.rng.int(0, 6)) {
            case 0:
              await this.press('ArrowUp', { delay: randomDelay() });
              break;
            case 1:
              await this.press('ArrowDown', { delay: randomDelay() });
              break;
            case 2:
              await this.press('ArrowRight', { delay: randomDelay() });
              break;
            case 3:
              await this.press('ArrowLeft', { delay: randomDelay() });
              break;
            case 4:
              await this.press('PageUp', { delay: randomDelay() });
              break;
            case 5:
              await this.press('PageDown', { delay: randomDelay() });
              break;
          }
          break;
        default:
          throw new Error(`Invalid IdleKeyboardBehavior value ${behavior}`);
      }
    });
  }
}
