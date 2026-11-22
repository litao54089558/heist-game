// The Midnight Vault — the night watch.
// A guard walks a fixed patrol (pausing at each post to look around),
// turns suspicious and walks to the last place it saw the thief, and
// chases when the alarm is high. Caught means touched, not just seen.
import {
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_SEARCH_SPEED,
  GUARD_R,
  CATCH_DIST,
  ALARM_SUSPICIOUS,
  ALARM_HUNTED,
} from './config.js';
import { moveCircle, dist } from './physics.js';
import { guardSees } from './detection.js';

export function createGuard(def) {
  const first = def.waypoints[0];
  return {
    x: first.x,
    y: first.y,
    r: GUARD_R,
    waypoints: def.waypoints,
    wp: 1 % def.waypoints.length,
    range: def.range,
    angle: 0,
    state: 'patrol', // patrol | pause | search | chase
    pauseTimer: 0,
    lookAngle: 0,
    lookTimer: 0,
    lastSeen: null,
    seenNow: false,
    seenDist: Infinity,
  };
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}

function moveTowards(level, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  guard.angle = Math.atan2(dy, dx);
  moveCircle(level, guard, guard.r, (dx / d) * step, (dy / d) * step);
  return Math.hypot(tx - guard.x, ty - guard.y) < 4;
}

export function updateGuard(level, guard, player, sneaking, alarm, dt) {
  const seen = guardSees(level, guard, player.x, player.y, sneaking);
  guard.seenNow = seen.seen;
  guard.seenDist = seen.dist;
  if (seen.seen) guard.lastSeen = { x: player.x, y: player.y };

  if (alarm >= ALARM_HUNTED && guard.lastSeen) {
    guard.state = 'chase';
  } else if (alarm >= ALARM_SUSPICIOUS && guard.lastSeen) {
    if (guard.state === 'patrol' || guard.state === 'pause') guard.state = 'search';
  } else if (alarm < ALARM_SUSPICIOUS * 0.6) {
    if (guard.state === 'search' || guard.state === 'chase') guard.state = 'patrol';
  }

  if (guard.state === 'chase' && guard.lastSeen) {
    moveTowards(level, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_CHASE_SPEED, dt);
    // Lose the trail: if the thief is gone and the guard reaches the
    // last seen spot, drop back to a search.
    if (dist(guard.x, guard.y, guard.lastSeen.x, guard.lastSeen.y) < 6 && !seen.seen) {
      guard.state = 'search';
      guard.pauseTimer = 1.2;
    }
    return;
  }

  if (guard.state === 'search' && guard.lastSeen) {
    const arrived = moveTowards(level, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_SEARCH_SPEED, dt);
    if (arrived) {
      guard.pauseTimer -= dt;
      guard.lookTimer -= dt;
      if (guard.lookTimer <= 0) {
        guard.lookTimer = 0.7;
        guard.lookAngle = guard.angle + (Math.random() - 0.5) * 2.2;
      }
      guard.angle = angleLerp(guard.angle, guard.lookAngle, Math.min(1, dt * 4));
      if (guard.pauseTimer <= 0) {
        guard.state = 'patrol';
        guard.lastSeen = null;
      }
    } else {
      guard.pauseTimer = 1.6;
    }
    return;
  }

  // Patrol: walk to the next post, pause there and look around.
  if (guard.state === 'pause') {
    guard.pauseTimer -= dt;
    guard.lookTimer -= dt;
    if (guard.lookTimer <= 0) {
      guard.lookTimer = 0.8;
      guard.lookAngle = guard.angle + (Math.random() - 0.5) * 2.4;
    }
    guard.angle = angleLerp(guard.angle, guard.lookAngle, Math.min(1, dt * 3));
    if (guard.pauseTimer <= 0) guard.state = 'patrol';
    return;
  }
  const target = guard.waypoints[guard.wp];
  const arrived = moveTowards(level, guard, target.x, target.y, GUARD_PATROL_SPEED, dt);
  if (arrived) {
    guard.wp = (guard.wp + 1) % guard.waypoints.length;
    guard.state = 'pause';
    guard.pauseTimer = 1.4;
    guard.lookTimer = 0;
    guard.lookAngle = guard.angle;
  }
}

export function guardCaughtPlayer(guard, player) {
  return dist(guard.x, guard.y, player.x, player.y) < CATCH_DIST;
}
