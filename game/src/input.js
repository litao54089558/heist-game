// The Midnight Vault — keyboard input, plus the fake input the
// self-test drives the game with.
export function createInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
  };
}

const KEYMAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
};

export function bindKeyboard(input, onAction) {
  window.addEventListener('keydown', (e) => {
    const field = KEYMAP[e.code];
    if (field) {
      input[field] = true;
      e.preventDefault();
    }
    if (onAction) onAction(e.code, true);
  });
  window.addEventListener('keyup', (e) => {
    const field = KEYMAP[e.code];
    if (field) {
      input[field] = false;
      e.preventDefault();
    }
    if (onAction) onAction(e.code, false);
  });
}

// A scripted input for self-tests: set directions per tick.
export function fakeInput() {
  const input = createInput();
  input.set = (dir) => {
    input.up = dir === 'up';
    input.down = dir === 'down';
    input.left = dir === 'left';
    input.right = dir === 'right';
    input.sneak = !!dir.sneak;
  };
  input.clear = () => {
    input.up = input.down = input.left = input.right = input.sneak = false;
  };
  return input;
}
