/**
 * Extra input sources besides the keyboard: a gamepad (standard layout) and
 * the on-screen touch buttons. Scenes call `pollInput()` once per frame.
 *
 * Gamepad: left stick or d-pad to move, A to jump, X or B to interact,
 * shoulder buttons to sprint, Start to pause.
 */

/** Written by the React touch buttons, read by the game. */
export const touchState = { left: false, right: false, jump: false, interact: false, sprint: false };

export interface InputFrame {
  dir: number; // -1 left, 0, 1 right
  sprint: boolean;
  jumpPressed: boolean; // true only on the frame the button goes down
  interactPressed: boolean;
  pausePressed: boolean;
  padConnected: boolean;
}

let previous = { jump: false, interact: false, pause: false };

function firstPad(): Gamepad | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  for (const pad of navigator.getGamepads()) if (pad?.connected) return pad;
  return null;
}

export function pollInput(): InputFrame {
  const pad = firstPad();
  const held = (i: number) => !!pad?.buttons[i]?.pressed;
  const axis = pad?.axes[0] ?? 0;

  let dir = 0;
  if (axis < -0.35 || held(14) || touchState.left) dir -= 1;
  if (axis > 0.35 || held(15) || touchState.right) dir += 1;
  const jump = held(0) || touchState.jump;
  const interact = held(2) || held(1) || touchState.interact;
  const pause = held(9);
  const sprint = held(4) || held(5) || held(7) || touchState.sprint;

  const frame: InputFrame = {
    dir,
    sprint,
    jumpPressed: jump && !previous.jump,
    interactPressed: interact && !previous.interact,
    pausePressed: pause && !previous.pause,
    padConnected: pad !== null,
  };
  previous = { jump, interact, pause };
  return frame;
}

export const NO_INPUT: InputFrame = {
  dir: 0, sprint: false, jumpPressed: false, interactPressed: false, pausePressed: false, padConnected: false,
};
