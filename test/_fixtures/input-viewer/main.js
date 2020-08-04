import { SimulatedMovement, Vector } from '../../../dist/src/util/movement';

const canvas = document.getElementById('canvas');

function getContext(canvas) {
  if (!canvas) throw new Error('no canvas');
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no context');
  return ctx;
}

const ctx = getContext(canvas);

function pctY(pct) {
  return canvas.height * pct;
}
function pctX(pct) {
  return canvas.width * pct;
}

const duration = 1000;
const bX = pctX(0.8);
const bY = pctY(0.4);
const cX = pctX(0.8);
const cY = pctY(0.4);

const eachPoints = [
  [pctX(0.1), pctY(0.1), pctX(0.7), pctY(0.7)],
  [pctX(0.1), pctY(0.1), pctX(0.7), pctY(0.7)],
  [pctX(0.1), pctY(0.1), pctX(0.7), pctY(0.7)],
  [pctX(0.1), pctY(0.1), pctX(0.7), pctY(0.7)],

  [pctX(0.8), pctY(0.9), pctX(0.1), pctY(0.2)],
  [pctX(0.8), pctY(0.9), pctX(0.1), pctY(0.2)],
  [pctX(0.8), pctY(0.9), pctX(0.1), pctY(0.2)],
  [pctX(0.8), pctY(0.9), pctX(0.1), pctY(0.2)],

  [pctX(0.9), pctY(0.1), pctX(0.1), pctY(0.8)],
  [pctX(0.9), pctY(0.1), pctX(0.1), pctY(0.8)],
  [pctX(0.9), pctY(0.1), pctX(0.1), pctY(0.8)],
  [pctX(0.9), pctY(0.1), pctX(0.1), pctY(0.8)],

  [pctX(0.05), pctY(0.95), pctX(0.95), pctY(0.05)],
  [pctX(0.05), pctY(0.95), pctX(0.95), pctY(0.05)],
  [pctX(0.05), pctY(0.95), pctX(0.95), pctY(0.05)],
  [pctX(0.05), pctY(0.95), pctX(0.95), pctY(0.05)],
].map(([fromX, fromY, toX, toY]) => [new SimulatedMovement().generatePath(new Vector(fromX, fromY), new Vector(toX, toY))]);

const colors = ['#808', '#880', '#088', '#800', '#080', '#008'];
for (let i = 0; i < eachPoints.length; i++) {
  for (let j = 0; j < eachPoints[i].length; j++) {
    ctx.fillStyle = 'black';
    const points = eachPoints[i][j];
    const fromX = points[0][0];
    const fromY = points[0][1];
    const toX = points[points.length - 1][0];
    const toY = points[points.length - 1][1];
    ctx.fillRect(fromX - 1, fromY - 1, 3, 3);
    ctx.fillRect(toX - 1, toY - 1, 3, 3);

    draw(points, colors[j]);
  }
}

function draw(points, color, index = 0) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const lastPoint = points[index - 1];
  const point = points[index];
  if (!point) return;
  if (lastPoint) {
    ctx.moveTo(lastPoint[0], lastPoint[1]);
    ctx.lineTo(point[0], point[1]);
    ctx.stroke();
  }
  setTimeout(() => {
    draw(points, color, index + 1);
  }, 16);
}
