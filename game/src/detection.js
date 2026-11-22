// The Midnight Vault — seeing and being seen.
// A viewer (guard or camera) sees the thief when the thief is inside
// its cone (range + half-angle) and a sampled ray from viewer to thief
// crosses no wall and no cover. Display cases and statues block sight;
// the thief's own tile never does.
import { isWall, tileKey } from './levels.js';
import { GUARD_VIEW_HALF_ANGLE, CAMERA_VIEW_HALF_ANGLE, SNEAK_VISION_FACTOR } from './config.js';

export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(d / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    const key = tileKey(x, y);
    if (level.walls.has(key) || level.covers.has(key)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export function inCone(vx, vy, angle, range, halfAngle, px, py) {
  const dx = px - vx;
  const dy = py - vy;
  const d = Math.hypot(dx, dy);
  if (d > range) return { seen: false, dist: d };
  if (d < 1) return { seen: true, dist: d };
  const toTarget = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toTarget, angle)) > halfAngle) return { seen: false, dist: d };
  return { seen: true, dist: d };
}

// Vision cone clipped by walls, for rendering: cast rays across the
// cone and stop each at the first wall tile.
export function conePolygon(level, vx, vy, angle, range, halfAngle, rays = 26) {
  const pts = [{ x: vx, y: vy }];
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let r = range;
    for (let s = 4; s <= range; s += 4) {
      if (isWall(level, vx + dx * s, vy + dy * s)) {
        r = s;
        break;
      }
    }
    pts.push({ x: vx + dx * r, y: vy + dy * r });
  }
  return pts;
}

export function guardSees(level, guard, px, py, sneaking) {
  const range = sneaking ? guard.range * SNEAK_VISION_FACTOR : guard.range;
  const c = inCone(guard.x, guard.y, guard.angle, range, GUARD_VIEW_HALF_ANGLE, px, py);
  if (!c.seen) return { seen: false, dist: c.dist };
  if (!hasLineOfSight(level, guard.x, guard.y, px, py)) return { seen: false, dist: c.dist };
  return { seen: true, dist: c.dist };
}

export function cameraSees(level, camera, px, py) {
  const c = inCone(camera.x, camera.y, camera.angle, camera.range, CAMERA_VIEW_HALF_ANGLE, px, py);
  if (!c.seen) return { seen: false, dist: c.dist };
  if (!hasLineOfSight(level, camera.x, camera.y, px, py)) return { seen: false, dist: c.dist };
  return { seen: true, dist: c.dist };
}

// How far along a ray from (x,y) at `angle` before a wall, capped at max.
export function rayDistance(level, x, y, angle, max) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let s = 4; s <= max; s += 4) {
    if (isWall(level, x + dx * s, y + dy * s)) return s;
  }
  return max;
}
