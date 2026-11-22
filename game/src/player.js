// The Midnight Vault — the thief.
import { PLAYER_R, PLAYER_SPEED, SNEAK_SPEED } from './config.js';
import { moveCircle } from './physics.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    r: PLAYER_R,
    facing: 0, // radians, follows movement
    moving: false,
    sneaking: false,
    stepTimer: 0,
    stepPhase: 0,
    justStepped: false,
  };
}

export function updatePlayer(level, player, input, dt) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  player.moving = dx !== 0 || dy !== 0;
  player.sneaking = !!input.sneak && player.moving;
  player.justStepped = false;
  if (!player.moving) return;
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  player.facing = Math.atan2(dy, dx);
  const speed = player.sneaking ? SNEAK_SPEED : PLAYER_SPEED;
  moveCircle(level, player, player.r, dx * speed * dt, dy * speed * dt);
  // Footstep timing drives the audio; sneaking steps are slower and softer.
  player.stepTimer -= dt;
  if (player.stepTimer <= 0) {
    player.stepTimer = player.sneaking ? 0.42 : 0.3;
    player.stepPhase = 1 - player.stepPhase;
    player.justStepped = true;
  }
}
