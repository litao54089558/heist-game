// The Midnight Vault — movement and collision.
// The thief and the guards are circles; walls and covers are tiles.
// Move one axis at a time so a circle slides along a wall instead of
// sticking on its corner.
import { TILE } from './config.js';
import { isBlocked } from './levels.js';

export function moveCircle(level, pos, r, dx, dy) {
  const nx = pos.x + dx;
  if (!circleHits(level, nx, pos.y, r)) pos.x = nx;
  const ny = pos.y + dy;
  if (!circleHits(level, pos.x, ny, r)) pos.y = ny;
}

export function circleHits(level, x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (level.walls.has(tx + ',' + ty) || level.covers.has(tx + ',' + ty)) {
        const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
        const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
        const ddx = x - cx;
        const ddy = y - cy;
        if (ddx * ddx + ddy * ddy < r * r) return true;
      }
    }
  }
  return false;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Step from (x0,y0) towards (x1,y1) in small increments and stop at the
// first blocked point. Used to keep patrol legs and sight rays honest.
export function segmentClear(level, x0, y0, x1, y1, step = 6) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d / step));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (isBlocked(level, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}
