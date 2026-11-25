export const ARENA_WIDTH = 2600;
export const HURDLES = [700, 950, 1200, 1450];
export const HURDLE_H = 50;
export const START_X = 450;
export const FINISH_X = 2300;
export const HOOP_X = 1850;
export const HOOP_REACH = 110;

export function createSports() {
  return { hurdles: 0, bumps: 0, baskets: 0, racing: false, time: 0, best: null, last: null };
}

// Returns the x the player ends up at; a low walk into a hurdle bumps them back.
export function moveThroughHurdles(s, fromX, toX, y) {
  for (const hx of HURDLES) {
    if ((fromX < hx) === (toX < hx)) continue;
    if (y >= HURDLE_H) { s.hurdles += 1; continue; }
    s.bumps += 1;
    return { x: fromX < hx ? hx - 14 : hx + 14, bumped: true };
  }
  return { x: toX, bumped: false };
}

export const nearStart = (x) => Math.abs(x - START_X) < 90;
export const nearHoop = (x) => Math.abs(x - HOOP_X) < HOOP_REACH;

export function startRace(s) {
  s.racing = true;
  s.time = 0;
}

export function tickRace(s, dt, x) {
  if (!s.racing) return false;
  s.time += dt;
  if (x < FINISH_X) return false;
  s.racing = false;
  s.last = s.time;
  if (s.best === null || s.time < s.best) s.best = s.time;
  return true;
}

export function shoot(s) {
  s.baskets += 1;
}
