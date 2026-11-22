// The Midnight Vault — in-browser self-test (?selftest=1).
// Drives the real game with scripted input and checks the mechanics
// a player depends on. Results go to the DOM and document.title so a
// headless run can read them without a console.
import { createGame, startGame, loadLevel, updateGame, retryLevel } from './state.js';
import { fakeInput } from './input.js';
import { TILE } from './config.js';

function step(game, input, seconds, dir) {
  const dt = 1 / 60;
  const n = Math.round(seconds / dt);
  input.set(dir);
  for (let i = 0; i < n; i++) updateGame(game, input, dt);
  input.clear();
}

export function runSelfTest() {
  const results = [];
  const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail });

  // 1. The thief moves right, and sneaking is slower.
  {
    const game = createGame();
    startGame(game);
    const input = fakeInput();
    const x0 = game.player.x;
    step(game, input, 1, 'right');
    const walked = game.player.x - x0;
    check('move-right', walked > 120, 'walked ' + Math.round(walked) + 'px in 1s');
    const x1 = game.player.x;
    input.set('right');
    input.sneak = true;
    for (let i = 0; i < 60; i++) updateGame(game, input, 1 / 60);
    input.clear();
    const snuck = game.player.x - x1;
    check('sneak-slower', snuck < walked * 0.65, 'sneak ' + Math.round(snuck) + 'px vs walk ' + Math.round(walked) + 'px');
  }

  // 2. A wall stops the thief (walk left into the border wall).
  {
    const game = createGame();
    startGame(game);
    const input = fakeInput();
    step(game, input, 3, 'left');
    check('wall-blocks', game.player.x > TILE + 10, 'x=' + Math.round(game.player.x) + ' (wall at 40)');
  }

  // 3. A guard patrols: it leaves its post within 3 seconds.
  {
    const game = createGame();
    startGame(game);
    const input = fakeInput();
    const g = game.guards[0];
    const gx0 = g.x;
    const gy0 = g.y;
    for (let i = 0; i < 180; i++) updateGame(game, input, 1 / 60);
    const moved = Math.hypot(g.x - gx0, g.y - gy0);
    check('guard-patrols', moved > 100, 'guard moved ' + Math.round(moved) + 'px in 3s');
  }

  // 4. Standing in a guard's cone raises the alarm. The guard's angle
  // is re-pinned each frame so its pause look-around cannot drift the
  // cone off the thief mid-test.
  {
    const game = createGame();
    startGame(game);
    const input = fakeInput();
    const g = game.guards[0];
    // Put the thief just in front of the guard, in the open.
    game.player.x = g.x;
    game.player.y = g.y + 90;
    g.state = 'pause';
    g.pauseTimer = 5;
    for (let i = 0; i < 60; i++) {
      g.angle = Math.PI / 2;
      updateGame(game, input, 1 / 60);
    }
    check('vision-raises-alarm', game.alarm > 25, 'alarm ' + Math.round(game.alarm) + ' after 1s in cone');
  }

  // 5. A display case between guard and thief blocks the sight line:
  // guard at tile (4,2) looks straight down column 4, the case at
  // (4,4) sits between it and the thief at (4,6).
  {
    const game = createGame();
    startGame(game);
    const input = fakeInput();
    const g = game.guards[0];
    g.x = 4.5 * TILE;
    g.y = 2.5 * TILE;
    g.state = 'pause';
    g.pauseTimer = 5;
    game.player.x = 4.5 * TILE;
    game.player.y = 6.5 * TILE;
    for (let i = 0; i < 60; i++) {
      g.angle = Math.PI / 2;
      updateGame(game, input, 1 / 60);
    }
    check('case-blocks-sight', game.alarm === 0, 'alarm ' + Math.round(game.alarm) + ' with a case in between');
  }

  // 6. A camera's cone raises the alarm too. The camera is moved to
  // open floor for the test (its level-1 perch sits over a wall spine)
  // and its sweep frozen so the cone stays on the thief.
  {
    const game = createGame();
    startGame(game);
    const input = fakeInput();
    const c = game.cameras[0];
    c.x = 6.5 * TILE;
    c.y = 2.5 * TILE;
    c.baseAngle = Math.PI / 2;
    c.sweep = 0;
    game.player.x = c.x;
    game.player.y = c.y + 120;
    for (let i = 0; i < 60; i++) updateGame(game, input, 1 / 60);
    check('camera-raises-alarm', game.alarm > 15, 'alarm ' + Math.round(game.alarm) + ' after 1s in camera cone');
  }

  // 7. Walking over loot pockets it and scores.
  {
    const game = createGame();
    startGame(game);
    const input = fakeInput();
    const loot = game.level.loot[0];
    game.player.x = loot.x - 60;
    game.player.y = loot.y;
    step(game, input, 1, 'right');
    check('loot-pickup', loot.taken && game.lootGot === 1 && game.score === 250, 'lootGot=' + game.lootGot + ' score=' + game.score);
  }

  // 8. The exit stays locked until all loot is pocketed, then opens.
  {
    const game = createGame();
    startGame(game);
    const input = fakeInput();
    const exit = game.level.exit;
    game.player.x = exit.x;
    game.player.y = exit.y;
    updateGame(game, input, 1 / 60);
    check('exit-locked', game.screen === 'playing', 'screen=' + game.screen + ' with 0/' + game.lootTotal + ' loot');
    for (const loot of game.level.loot) loot.taken = true;
    game.lootGot = game.lootTotal;
    updateGame(game, input, 1 / 60);
    check('exit-opens', game.screen === 'levelClear', 'screen=' + game.screen + ' with all loot');
  }

  // 9. Being caught restarts the same level.
  {
    const game = createGame();
    startGame(game);
    const input = fakeInput();
    game.alarm = 99.5;
    const g = game.guards[0];
    game.player.x = g.x;
    game.player.y = g.y + 60;
    g.state = 'pause';
    g.pauseTimer = 5;
    for (let i = 0; i < 30; i++) {
      g.angle = Math.PI / 2;
      updateGame(game, input, 1 / 60);
    }
    check('alarm-100-caught', game.screen === 'caught', 'screen=' + game.screen);
    retryLevel(game);
    check('retry-restarts', game.screen === 'playing' && game.alarm === 0 && game.lootGot === 0, 'screen=' + game.screen + ' alarm=' + game.alarm);
  }

  const passed = results.filter((r) => r.ok).length;
  const el = document.getElementById('selftest');
  if (el) {
    el.textContent = 'SELFTEST ' + passed + '/' + results.length + ' ' + (passed === results.length ? 'PASS' : 'FAIL') + '\n' +
      results.map((r) => (r.ok ? 'PASS' : 'FAIL') + ' ' + r.name + ' — ' + r.detail).join('\n');
  }
  document.title = 'SELFTEST ' + passed + '/' + results.length + ' ' + (passed === results.length ? 'PASS' : 'FAIL');
  return results;
}
