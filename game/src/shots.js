// Deterministic demo scenes for screenshots. One job: stage one frozen frame per shot.
import { SILENT } from './audio.js';

class ScriptedInput {
  constructor(plan) {
    this.plan = plan;
    this.step = 0;
  }

  axis() {
    return this.plan[Math.min(this.step, this.plan.length - 1)] || { x: 0, y: 0 };
  }

  get boost() {
    return false;
  }

  get brake() {
    return false;
  }

  consumeClick() {
    return false;
  }

  wasPressed() {
    return false;
  }

  endFrame() {
    this.step++;
  }
}

/**
 * Stage a frozen scene. Returns { input, steps, ambient, mode }:
 * main runs `steps` fixed updates with `input` (or updateAmbient when
 * ambient is true), then freezes the frame for the screenshot.
 */
export function stageShot(world, name) {
  if (name === 'play') return stagePlay(world);
  if (name === 'end') return stageEnd(world);
  return stageStart(world);
}

function stageStart(world) {
  world.resetRun();
  world.banner = null;
  world.ship.x = 1060;
  world.ship.y = 470;
  world.ship.angle = -Math.PI / 2;
  world.ring.x = 1020;
  world.ring.y = 200;
  return { input: null, steps: 60, ambient: true, mode: 'title' };
}

function stagePlay(world) {
  world.resetRun();
  world.buildLevel(2);
  world.banner = null;
  world.score = 1250;
  world.combo = 3;
  world.deliveriesDone = 2;
  world.timer = 41.3;
  world.hull = 3;
  world.boost = 70;
  // Clear the random field and place a composed scene: the ship flies toward
  // the ring along a clear corridor, rocks and parcels framing the shot.
  world.ship.x = 420;
  world.ship.y = 400;
  world.ship.vx = 190;
  world.ship.vy = -40;
  world.ship.angle = Math.atan2(-40, 190);
  world.ring.x = 900;
  world.ring.y = 300;
  world.asteroids = [
    { x: 180, y: 180, vx: 12, vy: 8, r: 34, rot: 0.4, vr: 0.2, verts: rockVerts(34, 7) },
    { x: 640, y: 130, vx: -10, vy: 14, r: 24, rot: 1.1, vr: -0.3, verts: rockVerts(24, 3) },
    { x: 1080, y: 180, vx: -16, vy: 6, r: 40, rot: 2.0, vr: 0.15, verts: rockVerts(40, 11) },
    { x: 300, y: 600, vx: 8, vy: -12, r: 28, rot: 0.9, vr: 0.4, verts: rockVerts(28, 5) },
    { x: 760, y: 600, vx: -6, vy: -9, r: 20, rot: 1.7, vr: -0.2, verts: rockVerts(20, 9) },
    { x: 1120, y: 520, vx: -12, vy: -7, r: 30, rot: 0.2, vr: 0.3, verts: rockVerts(30, 13) },
    { x: 980, y: 430, vx: 9, vy: 11, r: 18, rot: 2.6, vr: -0.4, verts: rockVerts(18, 2) },
    { x: 120, y: 420, vx: 14, vy: -6, r: 22, rot: 0.7, vr: 0.25, verts: rockVerts(22, 17) },
  ];
  world.parcels = [
    { x: 560, y: 520, vx: -8, vy: 6, value: 25, t: 0.4 },
    { x: 700, y: 240, vx: 10, vy: -5, value: 25, t: 1.9 },
    { x: 1040, y: 620, vx: -6, vy: 8, value: 25, t: 2.8 },
  ];
  world.pickups = [{ x: 640, y: 540, kind: 'shield', t: 0.8 }];
  world.mines = [];
  world.comets = [];
  const dir = { x: 0.978, y: -0.204 };
  const plan = [];
  for (let i = 0; i < 48; i++) plan.push(dir);
  for (let i = 0; i < 12; i++) plan.push({ x: 0, y: 0 });
  return { input: new ScriptedInput(plan), steps: 60, ambient: false, mode: 'playing' };
}

function stageEnd(world) {
  world.resetRun();
  world.buildLevel(3);
  world.banner = null;
  world.score = 4850;
  world._gameOver(SILENT);
  return { input: null, steps: 24, ambient: true, mode: 'gameover' };
}

function rockVerts(r, seed) {
  let a = seed * 2654435761 >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const verts = [];
  for (let i = 0; i < 10; i++) verts.push(0.72 + next() * 0.4);
  return verts;
}
