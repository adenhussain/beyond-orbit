import { useEffect, useRef } from 'react';
import { bridge } from '../../game/bridge';
import type { SuitHud } from '../../game/bridge';
import { createGame } from '../../game/config/gameConfig';
import type { StartScene } from '../../game/config/gameConfig';
import { useGame } from '../../state/useGame';

interface Props {
  scene: StartScene;
  /** True while a React overlay is open, so the astronaut stops responding. */
  inputLocked: boolean;
  onHud: (hud: SuitHud) => void;
}

/**
 * Mounts the Phaser game world. React never draws the astronaut or the
 * level: it only keeps the bridge up to date and shows interface on top.
 */
export function PhaserGame({ scene, inputLocked, onHud }: Props) {
  const { state, dispatch } = useGame();
  const container = useRef<HTMLDivElement>(null);

  // Keep the bridge current on every render.
  bridge.state = state;
  bridge.dispatch = dispatch;
  bridge.inputLocked = inputLocked;
  bridge.setHud = onHud;

  useEffect(() => {
    if (!container.current) return;
    const game = createGame(container.current, scene);
    // Development aid: lets you inspect the running game from the browser console.
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__bo = { game, bridge };
    return () => {
      bridge.setHud = () => {};
      game.destroy(true);
    };
  }, [scene]);

  return <div ref={container} className="absolute inset-0 bg-void" />;
}
