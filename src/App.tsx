import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { ArenaScene } from './game/ArenaScene';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!mountRef.current || gameRef.current) {
      return;
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mountRef.current,
      width: 1024,
      height: 704,
      backgroundColor: '#071016',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [ArenaScene],
      render: {
        antialias: true,
      },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="game-shell" aria-label="Tactical Clash game viewport">
        <div className="game-topline">
          <div>
            <span className="label">Tactical Clash</span>
            <strong>Squad Arena MVP</strong>
          </div>
          <div className="status-chip">4v4 · realtime tactics</div>
        </div>
        <div ref={mountRef} className="game-host" />
      </section>
    </main>
  );
}

