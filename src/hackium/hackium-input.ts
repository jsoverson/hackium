
import Logger from '../util/logger';
import { Mouse, Keyboard } from 'puppeteer/lib/Input';
import { waterfallMap } from '../util/promises';
import { getPointsBetween } from '../util/movement';

export interface Point {
  x: number;
  y: number;
}

export class HackiumMouse extends Mouse {
  log = new Logger('hackium:page:mouse');

  async xmove(
    x: number,
    y: number,
    options: { steps?: number, duration?: number } = {}
  ): Promise<void> {
    // steps are ignored and included for typing, duration is what matters to us.
    const { duration = Math.random() * 2000 } = options;

    const points = getPointsBetween(this._x, this._y, x, y, options);

    const moves = waterfallMap(points, (([x, y]) =>
      this._client.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        button: this._button,
        x, y,
        modifiers: this._keyboard._modifiers,
      }).then(() => { this._x = x; this._y = y })
    ));

    await moves;
  }


  // async move(x: number, y: number, duration = 1500): Promise<void> {
  //   const origPosition = { x: this._x, y: this._y };
  //   tween({
  //     from: origPosition,
  //     to: { x, y },
  //     duration: 1500,
  //     easing: 'easeOutQuad',
  //     step: (state: ) => console.log(state)
  //   }).then(
  //     () => console.log('All done!')
  //   );
  // }
}

export class HackiumKeyboard extends Keyboard {

}