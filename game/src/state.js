// The Midnight Vault — game state and the per-frame update.
// Owns the alarm meter, loot, the locked exit, lasers, scoring and
// the screen flow: menu -> playing -> levelClear / caught -> complete.
import {
  TILE,
  LOOT_R,
  EXIT_R,
  LOOT_SCORE,
  TIME_BONUS_PER_SECOND,
  LEVEL_PAR_SECONDS,
  ALARM_GUARD_NEAR,
  ALARM_GUARD_FAR,
  ALARM_CAMERA,
  ALARM_LASER,
  ALARM_DECAY,
  SNEAK_ALARM_FACTOR,
} from './config.js';
import { buildLevel, isBlocked } from './levels.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuard, updateGuard, guardCaughtPlayer } from './guards.js';
import { createCamera, updateCamera } from './cameras.js';
import { guardSees, cameraSees, hasLineOfSight } from './detection.js';
import { dist } from './physics.js';
import { sfx } from './audio.js';

export function createGame() {
  return {
    screen: 'menu', // menu | playing | paused | levelClear | caught | complete
    levelIndex: 0,
    level: null,
    player: null,
    guards: [],
    cameras: [],
    alarm: 0,
    score: 0,
    lootGot: 0,
    lootTotal: 0,
    time: 0,
    levelTime: 0,
    attempts: 0,
    spottedCount: 0,
    wasSeen: false,
    wasCameraSeen: false,
    wasLaser: false,
    levelBonus: 0,
    muted: false,
    message: '',
    messageTimer: 0,
    guardStepTimer: 0,
  };
}

export function loadLevel(game, index) {
  const level = buildLevel(index);
  game.levelIndex = index;
  game.level = level;
  game.player = createPlayer(level.start.x, level.start.y);
  game.guards = level.guards.map(createGuard);
  game.cameras = level.cameras.map(createCamera);
  game.alarm = 0;
  game.lootGot = 0;
  game.lootTotal = level.loot.length;
  game.levelTime = 0;
  game.wasSeen = false;
  game.wasCameraSeen = false;
  game.wasLaser = false;
  game.message = '';
  game.messageTimer = 0;
}

export function startGame(game) {
  game.score = 0;
  game.time = 0;
  game.attempts = 0;
  game.spottedCount = 0;
  loadLevel(game, 0);
  game.screen = 'playing';
}

export function laserIsLive(laser, t) {
  // A beam is live for the first half of each period, dark the second.
  const phase = ((t + laser.phase) % laser.period) / laser.period;
  return phase < 0.5;
}

function pointOnLaserSegment(laser, x, y) {
  // Distance from point to the beam segment, under 10px counts as crossing.
  const dx = laser.x2 - laser.x1;
  const dy = laser.y2 - laser.y1;
  const len2 = dx * dx + dy * dy;
  let t = ((x - laser.x1) * dx + (y - laser.y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = laser.x1 + dx * t;
  const cy = laser.y1 + dy * t;
  return Math.hypot(x - cx, y - cy) < 10;
}

function alarmRateFromGuard(guard, player, sneaking) {
  // Closer = faster. Sneaking halves the rise.
  const f = 1 - Math.min(1, guard.seenDist / guard.range);
  let rate = ALARM_GUARD_FAR + (ALARM_GUARD_NEAR - ALARM_GUARD_FAR) * f;
  if (sneaking) rate *= SNEAK_ALARM_FACTOR;
  return rate;
}

export function updateGame(game, input, dt) {
  if (game.screen !== 'playing') return;
  game.time += dt;
  game.levelTime += dt;
  if (game.messageTimer > 0) game.messageTimer -= dt;

  const level = game.level;
  const player = game.player;
  updatePlayer(level, player, input, dt);

  // Guards and cameras move first; detection reads their new angles.
  for (const g of game.guards) updateGuard(level, g, player, player.sneaking, game.alarm, dt);
  for (const c of game.cameras) updateCamera(c, dt);

  let seenByGuard = false;
  let seenByCamera = false;
  let rate = 0;
  for (const g of game.guards) {
    if (g.seenNow) {
      seenByGuard = true;
      rate = Math.max(rate, alarmRateFromGuard(g, player, player.sneaking));
    }
  }
  for (const c of game.cameras) {
    const seen = cameraSees(level, c, player.x, player.y);
    c.seenNow = seen.seen;
    c.seenDist = seen.dist;
    if (seen.seen) {
      seenByCamera = true;
      rate = Math.max(rate, ALARM_CAMERA);
    }
  }

  // Lasers: live beams spike the alarm while the thief stands in one.
  let inLaser = false;
  for (const laser of level.lasers) {
    if (laserIsLive(laser, game.levelTime) && pointOnLaserSegment(laser, player.x, player.y)) {
      inLaser = true;
    }
  }
  if (inLaser) {
    rate = Math.max(rate, ALARM_LASER);
    if (!game.wasLaser) sfx.laserZap();
  }
  game.wasLaser = inLaser;

  if (seenByGuard && !game.wasSeen) {
    sfx.spotted();
    game.spottedCount++;
  }
  if (seenByCamera && !game.wasCameraSeen) sfx.cameraBeep();
  game.wasSeen = seenByGuard;
  game.wasCameraSeen = seenByCamera;

  if (rate > 0) game.alarm += rate * dt;
  else game.alarm -= ALARM_DECAY * dt;
  game.alarm = Math.max(0, Math.min(100, game.alarm));

  // Footsteps: the player's own on each stride, plus the nearest
  // guard's, panned left/right so you hear the patrol coming.
  if (player.justStepped) {
    const nearest = game.guards.reduce((m, g) => Math.min(m, dist(player.x, player.y, g.x, g.y)), 9999);
    sfx.step(player.sneaking, nearest);
  }
  game.guardStepTimer -= dt;
  if (game.guardStepTimer <= 0) {
    game.guardStepTimer = 0.55;
    let nearestG = null;
    let nearestD = 9999;
    for (const g of game.guards) {
      const d = dist(player.x, player.y, g.x, g.y);
      if (d < nearestD) {
        nearestD = d;
        nearestG = g;
      }
    }
    if (nearestG && nearestD < 340) {
      const pan = Math.max(-1, Math.min(1, (nearestG.x - player.x) / 300));
      sfx.guardStep(pan, nearestD);
    }
  }

  // Loot: walk over it to pocket it.
  for (const loot of level.loot) {
    if (!loot.taken && dist(player.x, player.y, loot.x, loot.y) < LOOT_R + player.r) {
      loot.taken = true;
      game.lootGot++;
      game.score += LOOT_SCORE;
      sfx.pickup();
      if (game.lootGot === game.lootTotal) {
        game.message = 'All loot pocketed — the exit is open!';
        game.messageTimer = 3;
        sfx.unlock();
      } else {
        game.message = 'Loot ' + game.lootGot + ' / ' + game.lootTotal;
        game.messageTimer = 1.6;
      }
    }
  }

  // Exit: locked until every loot is pocketed.
  const exitOpen = game.lootGot === game.lootTotal;
  if (dist(player.x, player.y, level.exit.x, level.exit.y) < EXIT_R + player.r) {
    if (exitOpen) {
      const par = LEVEL_PAR_SECONDS[game.levelIndex];
      const bonus = Math.max(0, Math.round((par - game.levelTime) * TIME_BONUS_PER_SECOND));
      game.levelBonus = bonus;
      game.score += bonus;
      if (game.levelIndex + 1 >= 3) {
        game.screen = 'complete';
        sfx.win();
      } else {
        game.screen = 'levelClear';
        sfx.levelClear();
      }
      return;
    }
    if (game.messageTimer <= 0) {
      game.message = 'Locked — pocket all the loot first (' + game.lootGot + '/' + game.lootTotal + ')';
      game.messageTimer = 2;
    }
  }

  // Caught: a guard touches the thief, or the alarm maxes out.
  for (const g of game.guards) {
    if (guardCaughtPlayer(g, player)) {
      game.screen = 'caught';
      game.attempts++;
      sfx.caught();
      return;
    }
  }
  if (game.alarm >= 100) {
    game.screen = 'caught';
    game.attempts++;
    sfx.caught();
  }
}

export function alarmState(alarm) {
  if (alarm >= 82) return 'HUNTED';
  if (alarm >= 55) return 'WARY';
  return 'CALM';
}

export function retryLevel(game) {
  loadLevel(game, game.levelIndex);
  game.screen = 'playing';
}

export function nextLevel(game) {
  loadLevel(game, game.levelIndex + 1);
  game.screen = 'playing';
}

export { TILE, isBlocked, hasLineOfSight };
