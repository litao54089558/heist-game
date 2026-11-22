// The Midnight Vault — screenshot presets.
// ?shot=start|mid|alert puts the same shipped code into a fixed,
// readable game state and renders one frame. Nothing here is staged
// art: every pixel comes from the game's own renderer.
import { startGame, loadLevel } from './state.js';

export function applyShot(game, shot) {
  if (shot === 'start') {
    loadLevel(game, 0);
    game.screen = 'menu';
    return;
  }
  if (shot === 'mid') {
    // Level 2, mid-heist: two loot pocketed, one guard close with its
    // cone on the thief, a camera sweeping, alarm half raised.
    startGame(game);
    loadLevel(game, 1);
    game.screen = 'playing';
    const loot = game.level.loot;
    loot[0].taken = true;
    loot[1].taken = true;
    game.lootGot = 2;
    game.score = 500;
    game.player.x = 560;
    game.player.y = 300;
    game.player.facing = 0.5;
    game.alarm = 62;
    game.time = 61;
    game.levelTime = 61;
    const g = game.guards[0];
    g.x = 560;
    g.y = 190;
    g.angle = Math.PI / 2;
    g.state = 'search';
    g.lastSeen = { x: 560, y: 300 };
    game.cameras[0].angle = Math.PI / 2.4;
    game.cameras[0].t = 2.2;
    return;
  }
  if (shot === 'alert') {
    // Level 3, high alarm: a guard chasing, red cone, laser live,
    // alarm at 88 — the hunted moment.
    startGame(game);
    loadLevel(game, 2);
    game.screen = 'playing';
    const loot = game.level.loot;
    loot[0].taken = true;
    loot[1].taken = true;
    loot[2].taken = true;
    loot[3].taken = true;
    game.lootGot = 4;
    game.score = 1000;
    game.player.x = 620;
    game.player.y = 460;
    game.player.facing = -0.4;
    game.player.sneaking = true;
    game.alarm = 88;
    game.time = 95;
    game.levelTime = 95;
    const g = game.guards[2];
    g.x = 620;
    g.y = 380;
    g.angle = Math.PI / 2;
    g.state = 'chase';
    g.lastSeen = { x: 620, y: 460 };
    game.cameras[0].angle = Math.PI / 2;
    game.message = '';
    game.messageTimer = 0;
    return;
  }
}
