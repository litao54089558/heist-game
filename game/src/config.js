// The Midnight Vault — shared tuning constants.
// One place for every number the game balances on, so a level file
// never hides a magic number.
export const TILE = 40;
export const COLS = 30;
export const ROWS = 20;
export const VIEW_W = COLS * TILE; // 1200
export const VIEW_H = ROWS * TILE; // 800

export const PLAYER_R = 13;
export const PLAYER_SPEED = 172; // px/s walking
export const SNEAK_SPEED = 86; // px/s sneaking (Shift)
export const GUARD_R = 14;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 205;
export const GUARD_SEARCH_SPEED = 110;
export const LOOT_R = 17;
export const EXIT_R = 20;

// Alarm (0-100). Seen by a guard: rises fast up close, slower far away.
// Seen by a camera: rises at a fixed rate. Hidden: falls back.
export const ALARM_GUARD_NEAR = 62; // per second, point blank
export const ALARM_GUARD_FAR = 26; // per second, at max range
export const ALARM_CAMERA = 34; // per second in a camera cone
export const ALARM_LASER = 80; // per second while crossing a live beam
export const ALARM_DECAY = 24; // per second while unseen
export const ALARM_SUSPICIOUS = 55; // guards walk to last seen spot
export const ALARM_HUNTED = 82; // guards chase the thief
export const SNEAK_VISION_FACTOR = 0.62; // guard range shrinks vs sneaking
export const SNEAK_ALARM_FACTOR = 0.5; // alarm rises half as fast sneaking

export const GUARD_VIEW_HALF_ANGLE = (32 * Math.PI) / 180;
export const CAMERA_VIEW_HALF_ANGLE = (28 * Math.PI) / 180;
export const CAMERA_RANGE = 195;
export const CATCH_DIST = 27; // guard touching the thief ends the level

export const LOOT_SCORE = 250;
export const TIME_BONUS_PER_SECOND = 12; // level-clear bonus pool
export const LEVEL_PAR_SECONDS = [150, 180, 210];

// Palette: a night museum — warm gold loot on deep teal marble.
export const COLORS = {
  floorA: '#23393f',
  floorB: '#1f3338',
  wall: '#0e1a1d',
  wallTop: '#38606a',
  cover: '#3a5a61',
  coverTop: '#54707a',
  gold: '#f2c14e',
  goldDark: '#a67c1a',
  exit: '#39d98a',
  exitLocked: '#5a6b70',
  player: '#ffd166',
  playerSneak: '#e8b64c',
  guard: '#ff5d5d',
  guardCone: 'rgba(255, 93, 93, 0.26)',
  guardConeHunt: 'rgba(255, 40, 40, 0.38)',
  camera: '#7dd8ff',
  cameraCone: 'rgba(125, 216, 255, 0.22)',
  laser: '#ff3b6b',
  alarmCalm: '#39d98a',
  alarmWary: '#f2c14e',
  alarmHunted: '#ff5d5d',
  hudBg: '#101d20',
  text: '#eef6f3',
  muted: '#9db8b4',
};
