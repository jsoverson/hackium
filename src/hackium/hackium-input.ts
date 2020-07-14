import { CDPSession } from 'puppeteer/lib/Connection';
import { Keyboard, Mouse, MouseButtonInput } from 'puppeteer/lib/Input';
import { ElementHandle } from 'puppeteer/lib/JSHandle';
import { Viewport } from 'puppeteer/lib/PuppeteerViewport';
import { keyDefinitions, KeyInput } from 'puppeteer/lib/USKeyboardLayout.js';
import Logger from '../util/logger';
import { SimulatedMovement, Vector } from '../util/movement';
import { waterfallMap } from '../util/promises';
import { Random } from '../util/random';
import { HackiumPage } from './hackium-page';

export interface Point {
  x: number;
  y: number;
}

interface MouseOptions {
  button?: MouseButtonInput;
  clickCount?: number;
}

export enum IdleMouseBehavior {
  MOVE,
  PAUSE,
}

export class HackiumMouse extends Mouse {
  log = new Logger('hackium:page:mouse');
  private page: HackiumPage;
  rng = new Random();

  minDelay = 75;
  maxDelay = 500;
  minPause = 500;
  maxPause = 2000;

  constructor(client: CDPSession, keyboard: Keyboard, page: HackiumPage) {
    super(client, keyboard);
    this._x = this.rng.int(1, 600);
    this._y = this.rng.int(1, 600);
    this.page = page;
  }

  get x() {
    return this._x;
  }

  get y() {
    return this._y;
  }

  async moveTo(selector: string | ElementHandle) {
    const elementHandle = typeof selector === 'string' ? await this.page.$(selector) : selector;
    if (!elementHandle) throw new Error(`Can not find bounding box of ${selector}`);
    const box = await elementHandle.boundingBox();
    const x = this.rng.int(box.x, box.x + box.width);
    const y = this.rng.int(box.y, box.y + box.height);
    return this.move(x, y);
  }

  async click(x: number = this.x, y: number = this.y, options: MouseOptions & { delay?: number } = {}): Promise<void> {
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

  async move(x: number, y: number, options: { steps?: number; duration?: number } = {}): Promise<void> {
    // steps are ignored and included for typing, duration is what matters to us.
    const { duration = Math.random() * 2000 } = options;

    const points = new SimulatedMovement(4, 2, 5).generatePath(new Vector(this._x, this._y), new Vector(x, y));

    const moves = waterfallMap(points, ([x, y]) =>
      this._client
        .send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          button: this._button,
          x,
          y,
          modifiers: this._keyboard._modifiers,
        })
        .then(() => {
          this._x = x;
          this._y = y;
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
