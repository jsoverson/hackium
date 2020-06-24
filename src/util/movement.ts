
import * as d3 from 'd3-ease';
import { Random } from './random';

export const stepFunctions = {
  easePolyInOut: (t: number, from: number, to: number) => from + (to - from) * (d3.easePolyInOut(t)),
}

type StepFunction = (t: number, from: number, to: number) => number;

export function getPointsBetween(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  options: {
    stepFunction?: StepFunction,
    stepFunctionY?: StepFunction,
    stepFunctionX?: StepFunction,
    duration?: number
  } = {}
) {
  const {
    duration = 1000,
    stepFunction = stepFunctions.easePolyInOut,
    stepFunctionX = stepFunction,
    stepFunctionY = stepFunction
  } = options;
  const framerate = 60;
  const frames = Math.floor(duration / 1000 * framerate);
  const frameInterval = 1000 / framerate;

  return new Array(frames)
    .fill(frameInterval)
    .map((frameInterval, i) => i === frames - 1 ? 1 : (frameInterval * i) / duration) /* percentage to completion */
    .map((t) => {
      return [
        (stepFunctionX || stepFunction)(t, fromX, toX),
        (stepFunctionY || stepFunction)(t, fromY, toY),
        t
      ]
    })
  // .map((val) => { console.log(); return val; })
}



export class Vector {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  distanceTo(b: Vector) {
    return this.subtract(b).magnitude();
  }
  multiply(b: Vector | number) {
    return typeof b === 'number' ? new Vector(this.x * b, this.y * b) : new Vector(this.x * b.x, this.y * b.y)
  }
  divide(b: Vector | number) {
    return typeof b === 'number' ? new Vector(this.x / b, this.y / b) : new Vector(this.x / b.x, this.y / b.y)
  }
  subtract(b: Vector | number) {
    return typeof b === 'number' ? new Vector(this.x - b, this.y - b) : new Vector(this.x - b.x, this.y - b.y)
  }
  add(b: Vector | number) {
    return typeof b === 'number' ? new Vector(this.x + b, this.y + b) : new Vector(this.x + b.x, this.y + b.y)
  }
  magnitude() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }
  unit() {
    return this.divide(this.magnitude());
  }
}

export class SimulatedMovement {
  gravity: number;
  wind: number;
  targetArea: number;
  constructor(gravity: number = 5, wind: number = 5, targetArea: number = 50) {
    this.gravity = gravity;
    this.wind = wind;
    this.targetArea = targetArea;
  }
  generatePath(start: Vector, end: Vector, steps: number = 60, duration: number = 1000) {
    let velocity = new Vector(0, 0),
      force = new Vector(0, 0);

    const sqrt3 = Math.sqrt(3);
    const sqrt5 = Math.sqrt(5);

    const totalDistance = start.distanceTo(end);

    const points = [];
    let done = false;
    while (!done) {
      var remainingDistance = Math.max(start.distanceTo(end), 1);
      this.wind = Math.min(this.wind, remainingDistance);

      let hiccup = Random.rng.oneIn(6);
      let hiccupDistance = 2;

      let maxStep = Math.min(remainingDistance, hiccup ? hiccupDistance : totalDistance);

      // if we're further than the target area then go fast, otherwise slow down.
      if (remainingDistance >= this.targetArea) {
        force = force
          .divide(sqrt3)
          .add((Random.rng.float(0, this.wind * 2 + 1) - this.wind) / sqrt5);
      } else {
        force = force.divide(Math.SQRT2);
      }
      velocity = velocity
        .add(force)
        .add(end.subtract(start).multiply(this.gravity).divide(remainingDistance))

      if (velocity.magnitude() > maxStep) {
        var randomDist = maxStep / 2.0 + Random.rng.float(0, maxStep / 2);
        velocity = velocity.unit().multiply(randomDist);
      }

      start = start.add(velocity)

      points.push([start.x, start.y]);
      done = start.distanceTo(end) < 5;
    }
    return points;
  }
}
