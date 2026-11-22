// The Midnight Vault — level data.
// Legend: # wall, . floor, P thief start, E exit, L loot,
// D display case (cover, blocks sight), S statue (cover, blocks sight).
// Guards patrol the waypoint lists (tile coords); cameras hang from the
// ceiling at their tile and sweep. Lasers (level 3) are beam segments
// that blink on and off; crossing a live beam spikes the alarm.
import { TILE } from './config.js';

const L1_MAP = [
  '##############################',
  '#............................#',
  '#..L..........##.......L.....#',
  '#.............##.............#',
  '#..DDD........##......DDD....#',
  '#.............##.............#',
  '#.....P.......##.......E.....#',
  '#.............##.............#',
  '#..DDD........##......DDD....#',
  '#.............##.............#',
  '#.....S.......##.......S.....#',
  '#.............##.............#',
  '#..L..........##.......L.....#',
  '#............................#',
  '#............................#',
  '#.....DDD..........DDD.......#',
  '#............................#',
  '#..L....................L....#',
  '#............................#',
  '##############################',
];

const L2_MAP = [
  '##############################',
  '#............................#',
  '#..L..........DDD.......L....#',
  '#............................#',
  '#.....S..............S.......#',
  '#............................#',
  '#..DDD......P......DDD.......#',
  '#............................#',
  '#............................#',
  '##########..........##########',
  '##########..........##########',
  '#............................#',
  '#......D............D........#',
  '#............................#',
  '#..L...........E.........L...#',
  '#............................#',
  '#.....S..............S.......#',
  '#............................#',
  '#..L....................L....#',
  '##############################',
];

const L3_MAP = [
  '##############################',
  '#............................#',
  '#..L......##........##...L...#',
  '#.........##........##.......#',
  '#..DDD....##...S....##..DDD..#',
  '#.........##........##.......#',
  '#....P....##........##...E...#',
  '#.........##........##.......#',
  '#..DDD....##...S....##..DDD..#',
  '#.........##........##.......#',
  '#............................#',
  '#............................#',
  '#..L..........DDD........L...#',
  '#............................#',
  '#.....S..............S.......#',
  '#............................#',
  '#............................#',
  '#..L..........DDD........L...#',
  '#............................#',
  '##############################',
];

function parseMap(rows) {
  const walls = new Set();
  const covers = new Set();
  let start = null;
  let exit = null;
  const loot = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      const key = x + ',' + y;
      if (c === '#') walls.add(key);
      if (c === 'D' || c === 'S') covers.add(key);
      if (c === 'P') start = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      if (c === 'E') exit = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      if (c === 'L') loot.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
    }
  });
  return { walls, covers, start, exit, loot };
}

function guardDef(waypoints, range) {
  return {
    waypoints: waypoints.map(([cx, cy]) => ({ x: (cx + 0.5) * TILE, y: (cy + 0.5) * TILE })),
    range,
  };
}

function cameraDef(cx, cy, baseAngleDeg, sweepDeg) {
  return {
    x: (cx + 0.5) * TILE,
    y: (cy + 0.5) * TILE,
    baseAngle: (baseAngleDeg * Math.PI) / 180,
    sweep: (sweepDeg * Math.PI) / 180,
  };
}

function laserDef(x1, y1, x2, y2, period, phase) {
  return {
    x1: (x1 + 0.5) * TILE,
    y1: (y1 + 0.5) * TILE,
    x2: (x2 + 0.5) * TILE,
    y2: (y2 + 0.5) * TILE,
    period,
    phase,
  };
}

export const LEVELS = [
  {
    name: 'Gallery',
    sub: 'Level 1 — slip past the night watch',
    map: L1_MAP,
    guards: [
      guardDef([[10, 3], [10, 11]], 210),
      guardDef([[18, 9], [27, 9]], 210),
    ],
    cameras: [cameraDef(14, 1, 90, 55)],
    lasers: [],
  },
  {
    name: 'Vault Floor',
    sub: 'Level 2 — the cameras are awake now',
    map: L2_MAP,
    guards: [
      guardDef([[4, 3], [25, 3]], 230),
      guardDef([[20, 13], [27, 13]], 230),
      guardDef([[4, 15], [14, 15]], 230),
    ],
    cameras: [cameraDef(7, 1, 90, 50), cameraDef(22, 18, 270, 50)],
    lasers: [],
  },
  {
    name: 'The Vault',
    sub: 'Level 3 — lasers, four guards, one way out',
    map: L3_MAP,
    guards: [
      guardDef([[7, 2], [7, 8]], 250),
      guardDef([[22, 2], [22, 8]], 250),
      guardDef([[2, 13], [27, 13]], 250),
      guardDef([[12, 16], [22, 16], [22, 18], [12, 18]], 250),
    ],
    cameras: [
      cameraDef(14, 1, 90, 55),
      cameraDef(5, 18, 270, 45),
      cameraDef(24, 18, 270, 45),
    ],
    lasers: [
      laserDef(10, 10, 19, 10, 3.2, 0),
      laserDef(10, 11, 19, 11, 3.2, 1.6),
    ],
  },
];

export function buildLevel(index) {
  const def = LEVELS[index];
  const parsed = parseMap(def.map);
  return {
    index,
    name: def.name,
    sub: def.sub,
    map: def.map,
    walls: parsed.walls,
    covers: parsed.covers,
    start: parsed.start,
    exit: parsed.exit,
    loot: parsed.loot.map((l) => ({ ...l })),
    guards: def.guards.map((g) => ({
      waypoints: g.waypoints.map((w) => ({ ...w })),
      range: g.range,
    })),
    cameras: def.cameras.map((c) => ({ ...c })),
    lasers: def.lasers.map((l) => ({ ...l })),
  };
}

export function tileKey(x, y) {
  return Math.floor(x / TILE) + ',' + Math.floor(y / TILE);
}

export function isBlocked(level, x, y) {
  return level.walls.has(tileKey(x, y)) || level.covers.has(tileKey(x, y));
}

export function isWall(level, x, y) {
  return level.walls.has(tileKey(x, y));
}
