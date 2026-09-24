import { BODIES, type Body } from './data/mk8-bodies.js';
import { DRIVERS, type Driver } from './data/mk8-drivers.js';
import { GLIDERS, type Glider } from './data/mk8-gliders.js';
import { TIRES, type Tire } from './data/mk8-tires.js';

export interface KartRoll {
  driver: Driver;
  body: Body;
  tire: Tire;
  glider: Glider;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function rollKart(): KartRoll {
  return {
    driver: pickRandom(DRIVERS),
    body: pickRandom(BODIES),
    tire: pickRandom(TIRES),
    glider: pickRandom(GLIDERS),
  };
}
