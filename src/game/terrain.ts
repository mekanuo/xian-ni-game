import type { GroundShape, SceneDefinition } from './contracts';

type Random = () => number;
type Bounds = { x: number; y: number; w: number; h: number };

function randomFor(id: string): Random {
  let seed = [...id].reduce((n, c) => Math.imul(n, 31) + c.charCodeAt(0), 419);
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function pathOf(points: number[]): Path2D {
  const path = new Path2D();
  path.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1]);
  path.closePath();
  return path;
}
function boundsOf(points: number[]): Bounds {
  const xs = points.filter((_, i) => i % 2 === 0), ys = points.filter((_, i) => i % 2 === 1);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
function color(value: number): string { return `#${value.toString(16).padStart(6, '0')}`; }
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function wash(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string) {
  const shade = ctx.createRadialGradient(x, y, 0, x, y, radius);
  shade.addColorStop(0, fill); shade.addColorStop(1, 'transparent');
  ctx.fillStyle = shade; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function grain(ctx: CanvasRenderingContext2D, bounds: Bounds, count: number, random: Random, stone = false) {
  for (let i = 0; i < count; i++) {
    const x = bounds.x + random() * bounds.w, y = bounds.y + random() * bounds.h;
    ctx.fillStyle = random() > .46 ? (stone ? '#ecede029' : '#eff1cf26') : '#29453b1a';
    ctx.fillRect(x, y, .45 + random() * 1.6, .4 + random() * .65);
  }
}
function grass(ctx: CanvasRenderingContext2D, x: number, y: number, random: Random, alpha = .42) {
  ctx.lineWidth = .8;
  ctx.strokeStyle = `rgba(58,86,62,${alpha})`;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * 2.2;
    ctx.moveTo(x + dx, y);
    ctx.quadraticCurveTo(x + dx - 1, y - 2 - random() * 2, x + dx + (random() - .5) * 7, y - 3 - random() * 5);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,229,180,.38)';
  ctx.beginPath(); ctx.moveTo(x + 1, y - 1); ctx.lineTo(x + 2, y - 5); ctx.stroke();
}

/** Baked Canvas2D brushwork. Caller owns pixel density; coordinates stay in world units. */
export function paintTerrain(ctx: CanvasRenderingContext2D, map: SceneDefinition): void {
  ctx.save();
  const random = randomFor(map.id), full = { x: 0, y: 0, w: map.width, h: map.height };
  ctx.fillStyle = color(map.palette.ground); ctx.fillRect(0, 0, full.w, full.h);
  const daylight = ctx.createLinearGradient(0, 0, map.width * .3, map.height);
  daylight.addColorStop(0, '#dce2cc30'); daylight.addColorStop(.5, '#74918008'); daylight.addColorStop(1, '#365d4c20');
  ctx.fillStyle = daylight; ctx.fillRect(0, 0, full.w, full.h);

  // Broad transparent washes establish soil variations without a repeated stamp pattern.
  for (let i = 0; i < 100; i++) wash(ctx, random() * full.w, random() * full.h, 45 + random() * 140, random() > .5 ? '#d1d8b424' : '#536f5b1c');
  grain(ctx, full, 9000, random);
  const hardSurfaces = map.ground.filter(s => s.type !== 'grass');
  const surfacePaths = hardSurfaces.map(s => pathOf(s.points));
  const onSurface = (x: number, y: number) => surfacePaths.some(p => ctx.isPointInPath(p, x, y));
  // isPointInPath uses canvas coordinates, so inspect geometry with a unit transform.
  const contains = (x: number, y: number) => {
    ctx.save(); ctx.resetTransform(); const result = onSurface(x, y); ctx.restore(); return result;
  };
  for (let i = 0; i < 1400; i++) {
    const x = random() * full.w, y = random() * full.h;
    const cluster = Math.sin(x / 73 + Math.cos(y / 100)) * Math.cos(y / 87);
    if (cluster > -.15 && !contains(x, y)) grass(ctx, x, y, random, .12 + random() * .13);
  }

  // A union keeps crossing dirt lanes continuous rather than layering rectangular bands.
  const dirt = map.ground.filter(s => s.type === 'path');
  const dirtPath = new Path2D(); dirt.forEach(s => dirtPath.addPath(pathOf(s.points)));
  if (dirt.length) {
    ctx.save(); ctx.strokeStyle = '#b3af994c'; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.stroke(dirtPath); ctx.restore();
    ctx.save(); ctx.clip(dirtPath);
    ctx.fillStyle = '#b8b39e'; ctx.fillRect(0, 0, full.w, full.h);
    for (let i = 0; i < 180; i++) wash(ctx, random() * full.w, random() * full.h, 25 + random() * 95, random() > .45 ? '#e9dfbd25' : '#63776518');
    grain(ctx, full, 17000, random);
    for (let i = 0; i < 2400; i++) {
      const x = random() * full.w, y = random() * full.h, size = .8 + random() * 2.5;
      ellipse(ctx, x, y + .7, size, size * .48, '#53625432');
      ellipse(ctx, x - .3, y, size * .9, size * .35, random() > .5 ? '#ded7bc80' : '#87948460');
    }
    // Fine dry brush streaks follow each lane's long axis; these are wear, not rails.
    for (const lane of dirt) {
      const b = boundsOf(lane.points), horizontal = b.w > b.h;
      for (let i = 0; i < 60; i++) {
        const x = b.x + random() * b.w, y = b.y + random() * b.h;
        ctx.strokeStyle = random() > .5 ? '#efe4c322' : '#6c756219'; ctx.lineWidth = .7 + random();
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + (horizontal ? 9 + random() * 40 : random() * 2), y + (horizontal ? random() * 2 : 9 + random() * 40)); ctx.stroke();
      }
    }
    ctx.restore();
  }

  for (const shape of map.ground) {
    if (shape.type === 'path') continue;
    if (shape.type === 'grass') {
      const b = boundsOf(shape.points);
      ctx.save(); ctx.clip(pathOf(shape.points));
      for (let i = 0; i < 14; i++) wash(ctx, b.x + random() * b.w, b.y + random() * b.h, 25 + random() * 60, '#5678521c');
      ctx.restore(); continue;
    }
    if (shape.type === 'water') paintWater(ctx, shape, random);
    else paintStone(ctx, shape, random);
  }

  // Irregular fine verge extends at most six units outside the actual surface edge.
  for (const shape of hardSurfaces) {
    const p = shape.points;
    for (let i = 0; i < p.length; i += 2) {
      const j = (i + 2) % p.length, dx = p[j] - p[i], dy = p[j + 1] - p[i + 1], length = Math.hypot(dx, dy);
      if (!length) continue;
      const nx = dy / length, ny = -dx / length;
      for (let d = 9 + random() * 7; d < length; d += 9 + random() * 15) {
        const offset = 2 + random() * 4, x = p[i] + dx * d / length + nx * offset, y = p[i + 1] + dy * d / length + ny * offset;
        if (contains(x, y)) continue;
        if (shape.type === 'water') {
          ellipse(ctx, x, y + 1, 2 + random() * 3.5, 1.3 + random() * 1.4, '#536b6380');
          ellipse(ctx, x - .6, y, 1.4 + random() * 3, .6 + random(), '#ced0b9a0');
        } else if (random() > .45) grass(ctx, x, y, random, .24);
      }
    }
  }
  ctx.restore();
}

function paintStone(ctx: CanvasRenderingContext2D, shape: GroundShape, random: Random): void {
  const b = boundsOf(shape.points), floor = shape.type === 'floor';
  ctx.save(); ctx.clip(pathOf(shape.points));
  ctx.fillStyle = '#939f90'; ctx.fillRect(b.x, b.y, b.w, b.h);
  const height = floor ? 21 : 27;
  let row = 0;
  for (let y = b.y - 8; y < b.y + b.h; y += height) {
    let x = b.x - (row++ % 2 ? 28 : 9);
    while (x < b.x + b.w) {
      const width = 48 + random() * (floor ? 36 : 44), seam = .55, tilt = (random() - .5) * 2;
      const points = [x + 3, y + seam, x + width - 5, y + seam + tilt, x + width - seam, y + 5, x + width - 2, y + height - 4, x + width - 7, y + height - seam, x + seam, y + height - 2, x + seam, y + 4];
      const stone = pathOf(points);
      ctx.fillStyle = floor ? ['#adb3a2', '#b5b9a8', '#b0b7a5', '#b9bdab'][Math.floor(random() * 4)] : ['#a8b3a6', '#b2bbac', '#b9bead', '#aeb7a8'][Math.floor(random() * 4)];
      ctx.fill(stone);
      ctx.lineWidth = .8; ctx.strokeStyle = '#e4e5cc63';
      ctx.beginPath(); ctx.moveTo(x + 5, y + 2.6); ctx.lineTo(x + width - 6, y + 2.6 + tilt); ctx.stroke();
      ctx.strokeStyle = '#5b736e2b'; ctx.beginPath(); ctx.moveTo(x + width - 3, y + 6); ctx.lineTo(x + width - 4, y + height - 5); ctx.stroke();
      if (random() < .2) {
        ctx.strokeStyle = '#63787050'; ctx.lineWidth = .55; ctx.beginPath();
        ctx.moveTo(x + width * .32, y + 2); ctx.lineTo(x + width * .39, y + 9); ctx.lineTo(x + width * .32, y + 15); ctx.stroke();
      }
      if (random() < .32) ellipse(ctx, x + width - 3, y + height - 2, 3 + random() * 5, .8 + random() * 1.5, '#657f5d68');
      x += width;
    }
  }
  grain(ctx, b, Math.round(b.w * b.h / 70), random, true);
  for (let i = 0; i < Math.max(2, b.w * b.h / 20000); i++) {
    const x = b.x + 20 + random() * Math.max(1, b.w - 40), y = b.y + 15 + random() * Math.max(1, b.h - 30), rx = 12 + random() * 22, ry = 3 + random() * 5;
    ctx.beginPath(); ctx.moveTo(x - rx, y);
    ctx.bezierCurveTo(x - rx * .7, y - ry, x + rx * .5, y - ry * .8, x + rx, y);
    ctx.bezierCurveTo(x + rx * .4, y + ry, x - rx * .3, y + ry * .5, x - rx, y);
    ctx.fillStyle = '#627f7d32'; ctx.fill();
    ctx.strokeStyle = '#e2ebe161'; ctx.lineWidth = .65;
    ctx.beginPath(); ctx.moveTo(x - rx * .6, y + ry * .3); ctx.quadraticCurveTo(x, y + ry * .7, x + rx * .4, y + ry * .3); ctx.stroke();
  }
  // The worn lip stays inside the footprint and never claims additional walkable area.
  ctx.lineWidth = 3; ctx.strokeStyle = '#dee0c86b'; ctx.stroke(pathOf(shape.points));
  ctx.restore();
}

function paintWater(ctx: CanvasRenderingContext2D, shape: GroundShape, random: Random): void {
  const b = boundsOf(shape.points), path = pathOf(shape.points), vertical = b.h > b.w;
  ctx.save(); ctx.clip(path);
  const water = vertical ? ctx.createLinearGradient(b.x, 0, b.x + b.w, 0) : ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  water.addColorStop(0, '#8baba3'); water.addColorStop(.17, '#739b9b'); water.addColorStop(.55, '#698f98'); water.addColorStop(.86, '#789e9e'); water.addColorStop(1, '#99b3a6');
  ctx.fillStyle = water; ctx.fillRect(b.x, b.y, b.w, b.h);
  for (let i = 0; i < b.w * b.h / 950; i++) {
    const x = b.x + random() * b.w, y = b.y + random() * b.h, width = 4 + random() * 25;
    ctx.strokeStyle = random() > .35 ? '#e1eee439' : '#355e6b21'; ctx.lineWidth = .6 + random() * .8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + width * .3, y - 1.8, x + width * .65, y + 1.5, x + width, y - .5); ctx.stroke();
  }
  ctx.lineWidth = 7; ctx.strokeStyle = '#42675f48'; ctx.stroke(path);
  ctx.lineWidth = 1.2; ctx.strokeStyle = '#d9e5ce8c'; ctx.stroke(path);
  // Submerged pebbles interrupt the ruler-straight map boundary at a modest scale.
  for (let i = 0; i < shape.points.length; i += 2) {
    const j = (i + 2) % shape.points.length, dx = shape.points[j] - shape.points[i], dy = shape.points[j + 1] - shape.points[i + 1], length = Math.hypot(dx, dy);
    if (!length) continue;
    for (let d = 4; d < length; d += 12 + random() * 15) {
      const inset = 2 + random() * 5, x = shape.points[i] + dx * d / length - dy / length * inset, y = shape.points[i + 1] + dy * d / length + dx / length * inset;
      ellipse(ctx, x, y, 2 + random() * 5, 1.3 + random() * 2, '#a3b5a285');
    }
  }
  ctx.restore();
}
