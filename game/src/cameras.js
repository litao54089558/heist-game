// The Midnight Vault — ceiling cameras.
// A camera sits still and sweeps its cone back and forth. It cannot be
// fooled by sneaking: only cover and timing beat it.
import { CAMERA_RANGE, CAMERA_VIEW_HALF_ANGLE } from './config.js';

export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    range: CAMERA_RANGE,
    halfAngle: CAMERA_VIEW_HALF_ANGLE,
    angle: def.baseAngle,
    t: Math.random() * 10,
    seenNow: false,
    seenDist: Infinity,
  };
}

export function updateCamera(camera, dt) {
  camera.t += dt;
  // Smooth ping-pong sweep: sin gives a natural slow turn at the ends.
  camera.angle = camera.baseAngle + Math.sin(camera.t * 0.55) * camera.sweep;
}
