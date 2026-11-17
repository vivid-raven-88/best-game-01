// Boot, fixed-step loop and the title/play/pause/clear/over state machine.
import { VIEW_W, VIEW_H } from './config.js';
import { Input } from './input.js';
import { Sound, SILENT } from './audio.js';
import { World } from './world.js';
import { draw } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 20261116);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const input = new Input(canvas);
const sound = new Sound();
const world = new World(seed);

let mode = 'title';
let clearT = 0;
let frozen = false;

if (shotName) {
  const staged = stageShot(world, shotName);
  if (staged.ambient) {
    for (let i = 0; i < staged.steps; i++) world.updateAmbient(1 / 60);
  } else {
    for (let i = 0; i < staged.steps; i++) {
      world.update(1 / 60, staged.input, SILENT);
      staged.input.endFrame();
      if (world.overPending || world.clearPending) break;
    }
  }
  mode = staged.mode;
  frozen = true;
}

function fit() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener('resize', fit);
fit();

function tick(dt) {
  if (input.wasPressed('KeyM')) {
    sound.ensure();
    sound.toggleMute();
  }
  if (mode === 'title') {
    world.updateAmbient(dt);
    if (input.wasPressed('Enter') || input.consumeClick()) {
      sound.ensure();
      sound.click();
      world.resetRun();
      mode = 'playing';
    }
  } else if (mode === 'playing') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      mode = 'paused';
      return;
    }
    world.update(dt, input, sound);
    if (world.clearPending) {
      mode = 'levelclear';
      clearT = 2.6;
    } else if (world.overPending) {
      mode = 'gameover';
    }
  } else if (mode === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
      mode = 'playing';
    }
  } else if (mode === 'levelclear') {
    clearT -= dt;
    world.updateAmbient(dt);
    if (clearT <= 0 || input.wasPressed('Enter') || input.consumeClick()) {
      sound.click();
      world.nextLevel();
      mode = 'playing';
    }
  } else if (mode === 'gameover') {
    world.updateAmbient(dt);
    if (input.wasPressed('KeyR') || input.consumeClick()) {
      sound.ensure();
      sound.click();
      world.resetRun();
      mode = 'playing';
    }
  }
}

let last = performance.now();
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  if (!frozen) {
    acc += dt;
    let n = 0;
    while (acc >= 1 / 60 && n < 5) {
      tick(1 / 60);
      acc -= 1 / 60;
      n++;
    }
    if (n === 5) acc = 0;
  }
  draw(ctx, world, { mode, clearBonus: world.clearBonus || 0 });
  input.endFrame();
}
requestAnimationFrame(frame);
