import { useMemo } from 'react';

/** Small deterministic pseudo-random generator so the sky is the same every render. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

export function Starfield() {
  const stars = useMemo(() => {
    const random = seeded(42);
    return Array.from({ length: 110 }, () => ({
      left: random() * 100,
      top: random() * 100,
      size: random() < 0.85 ? 1 : 2,
      delay: random() * 6,
      duration: 3 + random() * 5,
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void" aria-hidden>
      {stars.map((star, index) => (
        <span
          key={index}
          className="absolute bg-ink"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
