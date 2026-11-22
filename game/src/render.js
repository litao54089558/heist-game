// The Midnight Vault — canvas rendering.
// A night museum in warm gold on deep teal: marble checker floor,
// glass display cases, statues, gold loot, green exit, red guard
// cones and blue camera cones. All art is drawn code, no images.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, COLORS } from './config.js';
import { conePolygon } from './detection.js';
import { GUARD_VIEW_HALF_ANGLE, CAMERA_VIEW_HALF_ANGLE } from './config.js';
import { alarmState, laserIsLive } from './state.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, level) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const key = x + ',' + y;
      if (level.walls.has(key)) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x * TILE, y * TILE, TILE, 4);
        continue;
      }
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      if (level.covers.has(key)) {
        // Display case: glass slab with a gold glint. Statue: plinth.
        const isStatue = level.map[y][x] === 'S';
        if (isStatue) {
          ctx.fillStyle = COLORS.coverTop;
          ctx.beginPath();
          ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = COLORS.cover;
          ctx.beginPath();
          ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = COLORS.cover;
          roundRect(ctx, x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8, 5);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 220, 130, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 220, 130, 0.35)';
          ctx.fillRect(x * TILE + 9, y * TILE + 9, 8, 5);
        }
      }
    }
  }
}

function drawLoot(ctx, game) {
  for (const loot of game.level.loot) {
    if (loot.taken) continue;
    const pulse = 1 + Math.sin(game.time * 3 + loot.x) * 0.08;
    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.scale(pulse, pulse);
    // Glow
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    g.addColorStop(0, 'rgba(242, 193, 78, 0.55)');
    g.addColorStop(1, 'rgba(242, 193, 78, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    // Gold diamond (the loot)
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COLORS.goldDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawExit(ctx, game) {
  const exit = game.level.exit;
  const open = game.lootGot === game.lootTotal;
  const pulse = open ? 1 + Math.sin(game.time * 4) * 0.06 : 1;
  ctx.save();
  ctx.translate(exit.x, exit.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = open ? COLORS.exit : COLORS.exitLocked;
  roundRect(ctx, -17, -17, 34, 34, 6);
  ctx.fill();
  ctx.strokeStyle = open ? '#c9ffe4' : '#8fa3a8';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#06281a';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', 0, 1);
  ctx.restore();
  if (open) {
    ctx.fillStyle = 'rgba(57, 217, 138, 0.12)';
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLasers(ctx, game) {
  for (const laser of game.level.lasers) {
    const live = laserIsLive(laser, game.levelTime);
    ctx.save();
    ctx.strokeStyle = live ? COLORS.laser : 'rgba(255, 59, 107, 0.25)';
    ctx.lineWidth = live ? 3 : 1.5;
    if (live) {
      ctx.shadowColor = COLORS.laser;
      ctx.shadowBlur = 10;
    }
    ctx.setLineDash(live ? [] : [6, 8]);
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();
    ctx.restore();
    // Emitters at both ends
    for (const [ex, ey] of [[laser.x1, laser.y1], [laser.x2, laser.y2]]) {
      ctx.fillStyle = live ? COLORS.laser : '#7a2b3f';
      ctx.beginPath();
      ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCones(ctx, game) {
  // Camera cones first (under guard cones), then guard cones.
  for (const cam of game.cameras) {
    const poly = conePolygon(game.level, cam.x, cam.y, cam.angle, cam.range, cam.halfAngle);
    ctx.fillStyle = cam.seenNow ? 'rgba(125, 216, 255, 0.34)' : COLORS.cameraCone;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
  }
  for (const g of game.guards) {
    const poly = conePolygon(game.level, g.x, g.y, g.angle, g.range, GUARD_VIEW_HALF_ANGLE);
    ctx.fillStyle = g.state === 'chase' ? COLORS.guardConeHunt : COLORS.guardCone;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCameras(ctx, game) {
  for (const cam of game.cameras) {
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.fillStyle = '#0b1618';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cam.seenNow ? '#ff5d5d' : COLORS.camera;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(cam.angle);
    ctx.fillStyle = '#0b1618';
    ctx.fillRect(4, -3, 10, 6);
    ctx.restore();
  }
}

function drawGuards(ctx, game) {
  for (const g of game.guards) {
    ctx.save();
    ctx.translate(g.x, g.y);
    // Body
    ctx.fillStyle = '#7a1f1f';
    ctx.beginPath();
    ctx.arc(0, 0, g.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(0, 0, g.r - 3, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick
    ctx.rotate(g.angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(g.r + 4, 0);
    ctx.lineTo(g.r - 4, -5);
    ctx.lineTo(g.r - 4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // State mark above the guard
    if (g.state === 'chase' || g.state === 'search') {
      ctx.fillStyle = g.state === 'chase' ? '#ff3b3b' : COLORS.gold;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.state === 'chase' ? '!' : '?', g.x, g.y - 26);
    }
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Soft light pool under the thief so they read at a glance.
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
  g.addColorStop(0, 'rgba(255, 209, 102, 0.22)');
  g.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = '#7a5b12';
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.sneaking ? COLORS.playerSneak : COLORS.player;
  ctx.beginPath();
  ctx.arc(0, 0, p.r - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.facing);
  ctx.fillStyle = '#3a2c05';
  ctx.beginPath();
  ctx.moveTo(p.r + 3, 0);
  ctx.lineTo(p.r - 5, -5);
  ctx.lineTo(p.r - 5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 20, 22, 0.88)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function centerText(ctx, text, y, size, color, bold = false) {
  ctx.fillStyle = color;
  ctx.font = (bold ? 'bold ' : '') + size + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW_W / 2, y);
}

function drawMenu(ctx, game) {
  ctx.fillStyle = 'rgba(6, 14, 16, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 330, 150, 660, 480);
  centerText(ctx, 'THE MIDNIGHT VAULT', 215, 44, COLORS.gold, true);
  centerText(ctx, 'A heist in three rooms — take the loot, dodge the watch.', 262, 19, COLORS.text);
  centerText(ctx, 'Guards sweep their vision cones. Cameras sweep theirs.', 300, 17, COLORS.muted);
  centerText(ctx, 'Sneak (Shift) to shrink a guard\u2019s sight — cameras don\u2019t care.', 326, 17, COLORS.muted);
  centerText(ctx, 'Pocket every gold loot, then slip out the green EXIT.', 352, 17, COLORS.muted);
  centerText(ctx, 'If the alarm hits 100 — or a guard lays a hand on you — it\u2019s over.', 378, 17, COLORS.muted);
  centerText(ctx, 'WASD / arrows — move      Shift — sneak      Esc — pause', 430, 18, COLORS.text);
  centerText(ctx, 'M — mute      Click Start or press Enter', 462, 17, COLORS.muted);
  // Start button
  ctx.fillStyle = COLORS.gold;
  roundRect(ctx, VIEW_W / 2 - 110, 500, 220, 56, 10);
  ctx.fill();
  centerText(ctx, 'START THE HEIST', 528, 22, '#3a2c05', true);
  centerText(ctx, '3 levels  ·  6 loot each  ·  free to play, no sign-up', 600, 15, COLORS.muted);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(6, 14, 16, 0.66)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 220, 300, 440, 180);
  centerText(ctx, 'PAUSED', 350, 36, COLORS.text, true);
  centerText(ctx, 'Esc or click to resume', 400, 17, COLORS.muted);
}

function drawLevelClear(ctx, game) {
  ctx.fillStyle = 'rgba(6, 14, 16, 0.66)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 280, 240, 560, 320);
  centerText(ctx, game.level.name.toUpperCase() + ' — CLEAN GETAWAY', 295, 30, COLORS.exit, true);
  centerText(ctx, 'Loot ' + game.lootTotal + ' / ' + game.lootTotal + '    Time ' + Math.round(game.levelTime) + 's', 345, 19, COLORS.text);
  centerText(ctx, 'Time bonus  +' + game.levelBonus, 380, 19, COLORS.gold);
  centerText(ctx, 'Score  ' + game.score, 415, 22, COLORS.text, true);
  ctx.fillStyle = COLORS.gold;
  roundRect(ctx, VIEW_W / 2 - 110, 460, 220, 52, 10);
  ctx.fill();
  centerText(ctx, game.levelIndex + 1 >= 3 ? 'SEE THE TAKE' : 'NEXT ROOM', 486, 20, '#3a2c05', true);
}

function drawCaught(ctx, game) {
  ctx.fillStyle = 'rgba(20, 6, 8, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 280, 250, 560, 300);
  centerText(ctx, 'BUSTED', 305, 40, COLORS.guard, true);
  centerText(ctx, game.alarm >= 100 ? 'The alarm hit 100 — the vault locked down.' : 'A guard caught you in the open.', 355, 18, COLORS.text);
  centerText(ctx, 'Score ' + game.score + '    Attempts ' + game.attempts, 395, 19, COLORS.muted);
  ctx.fillStyle = COLORS.gold;
  roundRect(ctx, VIEW_W / 2 - 110, 450, 220, 52, 10);
  ctx.fill();
  centerText(ctx, 'TRY AGAIN', 476, 20, '#3a2c05', true);
}

function drawComplete(ctx, game) {
  ctx.fillStyle = 'rgba(6, 14, 16, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 300, 210, 600, 380);
  centerText(ctx, 'THE VAULT IS EMPTY', 265, 38, COLORS.gold, true);
  centerText(ctx, 'Three rooms, every loot pocketed, no cuffs.', 315, 18, COLORS.text);
  centerText(ctx, 'Final score  ' + game.score, 365, 24, COLORS.text, true);
  centerText(ctx, 'Total time  ' + Math.round(game.time) + 's    Times spotted  ' + game.spottedCount + '    Attempts  ' + game.attempts, 405, 17, COLORS.muted);
  const verdict =
    game.spottedCount === 0 ? 'A ghost — never seen once.' : game.spottedCount <= 3 ? 'A clean professional.' : 'Loud, but rich.';
  centerText(ctx, verdict, 445, 19, COLORS.gold);
  ctx.fillStyle = COLORS.gold;
  roundRect(ctx, VIEW_W / 2 - 110, 490, 220, 52, 10);
  ctx.fill();
  centerText(ctx, 'PLAY AGAIN', 516, 20, '#3a2c05', true);
}

export function drawWorld(ctx, game) {
  drawFloor(ctx, game.level);
  drawLoot(ctx, game);
  drawExit(ctx, game);
  drawLasers(ctx, game);
  drawCones(ctx, game);
  drawCameras(ctx, game);
  drawGuards(ctx, game);
  drawPlayer(ctx, game);
  // Toast message
  if (game.messageTimer > 0) {
    ctx.fillStyle = 'rgba(8, 20, 22, 0.85)';
    const w = ctx.measureText(game.message).width + 36;
    roundRect(ctx, VIEW_W / 2 - w / 2, 14, w, 34, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.message, VIEW_W / 2, 32);
  }
}

export function drawScreen(ctx, game) {
  if (game.screen === 'menu') drawMenu(ctx, game);
  else if (game.screen === 'paused') drawPaused(ctx);
  else if (game.screen === 'levelClear') drawLevelClear(ctx, game);
  else if (game.screen === 'caught') drawCaught(ctx, game);
  else if (game.screen === 'complete') drawComplete(ctx, game);
}

export function alarmColor(alarm) {
  const s = alarmState(alarm);
  if (s === 'HUNTED') return COLORS.alarmHunted;
  if (s === 'WARY') return COLORS.alarmWary;
  return COLORS.alarmCalm;
}
