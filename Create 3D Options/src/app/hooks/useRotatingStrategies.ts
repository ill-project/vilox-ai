import { useState, useEffect } from 'react';
import { ALL_STRATEGIES } from '../mockData';

// Simple seeded LCG — same seed always produces the same shuffle
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0x100000000;
  };
}

// Pick 4 unique strategies from the full pool using an hourly seed
function pickStrategies(hourSeed: number) {
  const pool = [...ALL_STRATEGIES];
  const rand = seededRandom(hourSeed);
  const picked = [];
  while (picked.length < 4 && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(...pool.splice(idx, 1));
  }
  return picked;
}

export function useRotatingStrategies() {
  const getHourSeed = () => Math.floor(Date.now() / (1000 * 60 * 60));

  const [hourSeed, setHourSeed] = useState(getHourSeed);
  const [minutesLeft, setMinutesLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const currentSeed = Math.floor(now / (1000 * 60 * 60));
      const msLeft = (currentSeed + 1) * 3_600_000 - now;
      setMinutesLeft(Math.ceil(msLeft / 60_000));
      if (currentSeed !== hourSeed) setHourSeed(currentSeed);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hourSeed]);

  return {
    strategies: pickStrategies(hourSeed),
    minutesLeft,
    lastRotated: new Date(hourSeed * 3_600_000),
  };
}
