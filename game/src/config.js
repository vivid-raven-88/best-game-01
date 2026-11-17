// Comet Courier — tuning and level rules. One job: the numbers.
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const SHIP_RADIUS = 16;
export const SHIP_ACCEL = 950;
export const SHIP_DRAG = 0.55;
export const SHIP_MAX_SPEED = 430;
export const BOOST_MULT = 2.1;
export const BOOST_MAX_SPEED = 640;
export const BOOST_MAX = 100;
export const BOOST_DRAIN = 55;
export const BOOST_REGEN = 22;

export const HULL_MAX = 3;
export const LEVEL_TIME = 75;
export const RING_RADIUS = 46;
export const RING_CATCH = 42;
export const PULSE_RADIUS = 280;
export const PULSE_PULL = 700;
export const PULSE_COOLDOWN = 2.5;
export const MAGNET_RADIUS = 340;

export function deliveriesForLevel(level) {
  return Math.min(3 + level, 8);
}
export function asteroidCount(level) {
  return Math.min(6 + 4 * level, 34);
}
export function asteroidSpeed(level) {
  return 20 + 6 * level;
}
export function mineCount(level) {
  return level >= 3 ? Math.min(level - 2, 6) : 0;
}
export function cometEvery(level) {
  return level >= 5 ? 9 : Infinity;
}
export function comboMultiplier(combo) {
  return 1 + Math.min(combo, 4) * 0.5;
}

export const COLORS = {
  skyTop: '#0b1030',
  skyMid: '#2a1650',
  skyLow: '#7a2d5e',
  shipBody: '#ffd166',
  shipTrim: '#ff8c42',
  shipGlow: '#ffe9a8',
  ring: '#4de3ff',
  ringCore: '#b8f6ff',
  parcel: '#ffb703',
  asteroid: '#8d99ae',
  asteroidDark: '#5c6675',
  mine: '#ef476f',
  comet: '#ffea00',
  hud: '#eaf6ff',
  hudDim: '#9db8d6',
  danger: '#ff5d5d',
  good: '#7dff9e',
};
