// The Midnight Vault — startup, main loop and HUD.
// The game state lives in state.js; this file wires it to the page:
// keyboard, canvas, HUD bar, buttons, ?shot= presets and ?selftest=1.
import { VIEW_W, VIEW_H, COLORS } from './config.js';
import { createGame, startGame, updateGame, retryLevel, nextLevel, alarmState, loadLevel } from './state.js';
import { createInput, bindKeyboard } from './input.js';
import { drawWorld, drawScreen, alarmColor } from './render.js';
import { applyShot } from './shots.js';
import { runSelfTest } from './selftest.js';
import { ensureAudio, sfx, setMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const game = createGame();
const input = createInput();

// Test hook: the playtest drives and reads the game through this.
window.__vault = { game, input };

const hudAlarmFill = document.getElementById('alarm-fill');
const hudAlarmLabel = document.getElementById('alarm-label');
const hudLevel = document.getElementById('hud-level');
const hudLoot = document.getElementById('hud-loot');
const hudScore = document.getElementById('hud-score');
const hudTime = document.getElementById('hud-time');
const hudMute = document.getElementById('hud-mute');

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return m + ':' + String(ss).padStart(2, '0');
}

function updateHud() {
  if (!game.level) {
    hudLevel.textContent = 'The Midnight Vault';
    return;
  }
  hudLevel.textContent = 'Level ' + (game.levelIndex + 1) + ' — ' + game.level.name;
  hudLoot.textContent = 'Loot ' + game.lootGot + '/' + game.lootTotal;
  hudScore.textContent = 'Score ' + game.score;
  hudTime.textContent = fmtTime(game.time);
  hudAlarmFill.style.width = Math.round(game.alarm) + '%';
  hudAlarmFill.style.background = alarmColor(game.alarm);
  hudAlarmLabel.textContent = 'ALARM ' + alarmState(game.alarm) + ' ' + Math.round(game.alarm);
  hudAlarmLabel.style.color = alarmColor(game.alarm);
  hudMute.textContent = game.muted ? 'Unmute (M)' : 'Mute (M)';
}

function inButton(x, y, y0, y1) {
  return x >= VIEW_W / 2 - 110 && x <= VIEW_W / 2 + 110 && y >= y0 && y <= y1;
}

function handleClick(x, y) {
  ensureAudio();
  if (game.screen === 'menu') {
    if (inButton(x, y, 500, 556)) {
      sfx.click();
      startGame(game);
    }
    return;
  }
  if (game.screen === 'paused') {
    game.screen = 'playing';
    return;
  }
  if (game.screen === 'levelClear') {
    if (y >= 460 && y <= 512) {
      sfx.click();
      if (game.levelIndex + 1 >= 3) {
        // The clear card for the last level doubles as the complete card's door.
        game.screen = 'complete';
      } else {
        nextLevel(game);
      }
    }
    return;
  }
  if (game.screen === 'caught') {
    if (y >= 450 && y <= 502) {
      sfx.click();
      retryLevel(game);
    }
    return;
  }
  if (game.screen === 'complete') {
    if (y >= 490 && y <= 542) {
      sfx.click();
      startGame(game);
    }
  }
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
  const y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
  handleClick(x, y);
});

bindKeyboard(input, (code, down) => {
  if (!down) return;
  if (code === 'Enter' || code === 'Space') {
    ensureAudio();
    if (game.screen === 'menu') startGame(game);
    else if (game.screen === 'levelClear') {
      if (game.levelIndex + 1 >= 3) game.screen = 'complete';
      else nextLevel(game);
    } else if (game.screen === 'caught') retryLevel(game);
    else if (game.screen === 'complete') startGame(game);
  }
  if (code === 'Escape') {
    if (game.screen === 'playing') game.screen = 'paused';
    else if (game.screen === 'paused') game.screen = 'playing';
  }
  if (code === 'KeyM') {
    game.muted = !game.muted;
    setMuted(game.muted);
    updateHud();
  }
});

hudMute.addEventListener('click', () => {
  game.muted = !game.muted;
  setMuted(game.muted);
  updateHud();
});

// Boot: menu over level 1, or a screenshot / self-test mode.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const selftest = params.get('selftest');

loadLevel(game, 0);
game.screen = 'menu';
if (shot) applyShot(game, shot);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // A ?shot= still is one fixed frame of the shipped code: never advance
  // the simulation, or the preset state would play itself into a
  // different screen (e.g. a mid-heist alarm reaching 100) before the
  // screenshot lands.
  if (game.screen === 'playing' && !shot) updateGame(game, input, dt);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.level) drawWorld(ctx, game);
  drawScreen(ctx, game);
  updateHud();
  requestAnimationFrame(frame);
}

if (selftest) {
  const results = runSelfTest();
  console.log(results);
} else {
  requestAnimationFrame(frame);
}
