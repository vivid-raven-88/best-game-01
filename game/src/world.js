// The game world. One job: everything that moves, collides and scores.
import {
  VIEW_W, VIEW_H, SHIP_RADIUS, SHIP_ACCEL, SHIP_DRAG, SHIP_MAX_SPEED,
  BOOST_MULT, BOOST_MAX_SPEED, BOOST_MAX, BOOST_DRAIN, BOOST_REGEN,
  HULL_MAX, LEVEL_TIME, RING_RADIUS, RING_CATCH, PULSE_RADIUS, PULSE_PULL,
  PULSE_COOLDOWN, MAGNET_RADIUS, deliveriesForLevel, asteroidCount,
  asteroidSpeed, mineCount, cometEvery, comboMultiplier,
} from './config.js';
import { makeRng } from './random.js';

const TAU = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export class World {
  constructor(seed) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.time = 0;
    this.stars = [];
    this.nebula = [];
    const layers = [0.2, 0.45, 0.8];
    for (let l = 0; l < 3; l++) {
      for (let i = 0; i < 70; i++) {
        this.stars.push({
          x: this.rng.range(0, VIEW_W),
          y: this.rng.range(0, VIEW_H),
          r: this.rng.range(0.6, 1.6 + l * 0.5),
          layer: layers[l],
          phase: this.rng.range(0, TAU),
        });
      }
    }
    const blobColors = ['#3b2d8f', '#8f2d6b', '#2d6b8f', '#6b2d8f', '#2d3a8f'];
    for (let i = 0; i < 5; i++) {
      this.nebula.push({
        x: this.rng.range(0, VIEW_W),
        y: this.rng.range(0, VIEW_H),
        r: this.rng.range(220, 420),
        color: blobColors[i % blobColors.length],
        alpha: this.rng.range(0.10, 0.2),
      });
    }
    this.resetRun();
  }

  resetRun() {
    this.score = 0;
    this.best = 0;
    this.level = 1;
    this.combo = 0;
    this.hull = HULL_MAX;
    this.clearPending = false;
    this.overPending = false;
    this.finalScore = 0;
    this.levelReached = 1;
    this.buildLevel(1);
  }

  buildLevel(level) {
    const rng = this.rng;
    this.level = level;
    this.timer = LEVEL_TIME;
    this.deliveriesDone = 0;
    this.deliveriesNeeded = deliveriesForLevel(level);
    this.boost = BOOST_MAX;
    this.pulseCd = 0;
    this.shieldT = 0;
    this.magnetT = 0;
    this.invuln = 0;
    this.shake = 0;
    this.flash = 0;
    this.cometT = cometEvery(level);
    this.parcelT = 3;
    this.pickupT = 9;
    this.wasBoosting = false;
    this.particles = [];
    this.floaters = [];
    this.ship = {
      x: VIEW_W / 2, y: VIEW_H / 2 + 80, vx: 0, vy: 0,
      angle: -Math.PI / 2, thrusting: false, boosting: false,
    };
    this.asteroids = [];
    for (let i = 0; i < asteroidCount(level); i++) this.asteroids.push(this._makeAsteroid(true));
    this.mines = [];
    for (let i = 0; i < mineCount(level); i++) {
      const p = this._farPoint(200);
      this.mines.push({ x: p.x, y: p.y, r: 18, phase: rng.range(0, TAU) });
    }
    this.comets = [];
    this.parcels = [];
    for (let i = 0; i < 3; i++) this._spawnParcel();
    this.pickups = [];
    this._spawnRing();
    this.banner = { text: `LEVEL ${level}`, sub: `DELIVER ${this.deliveriesNeeded} PARCELS`, t: 2.4 };
  }

  _farPoint(minDist) {
    const rng = this.rng;
    for (let tries = 0; tries < 40; tries++) {
      const x = rng.range(70, VIEW_W - 70);
      const y = rng.range(70, VIEW_H - 70);
      if (dist2(x, y, this.ship.x, this.ship.y) > minDist * minDist) return { x, y };
    }
    return { x: rng.range(70, VIEW_W - 70), y: rng.range(70, VIEW_H - 70) };
  }

  _makeAsteroid(awayFromShip) {
    const rng = this.rng;
    const p = awayFromShip ? this._farPoint(190) : { x: rng.range(50, VIEW_W - 50), y: rng.range(50, VIEW_H - 50) };
    const speed = asteroidSpeed(this.level) * rng.range(0.5, 1.5);
    const a = rng.angle();
    const r = rng.range(14, 46);
    const verts = [];
    const n = 10;
    for (let i = 0; i < n; i++) verts.push(rng.range(0.72, 1.12));
    return {
      x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      r, rot: rng.range(0, TAU), vr: rng.range(-0.7, 0.7), verts,
    };
  }

  _spawnRing() {
    const p = this._farPoint(280);
    this.ring = { x: p.x, y: p.y, r: RING_RADIUS, phase: 0 };
  }

  _spawnParcel() {
    const rng = this.rng;
    const p = this._farPoint(150);
    this.parcels.push({
      x: p.x, y: p.y, vx: rng.range(-14, 14), vy: rng.range(-14, 14),
      value: 25, t: rng.range(0, TAU),
    });
  }

  _spawnPickup() {
    const rng = this.rng;
    const kinds = ['shield', 'repair', 'boost', 'magnet'];
    const p = this._farPoint(160);
    this.pickups.push({
      x: p.x, y: p.y, kind: kinds[Math.floor(rng.next() * kinds.length)],
      t: rng.range(0, TAU),
    });
  }

  _burst(x, y, color, n, speed, life) {
    for (let i = 0; i < n; i++) {
      const a = this.rng.angle();
      const s = this.rng.range(speed * 0.3, speed);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: this.rng.range(life * 0.5, life), maxLife: life,
        size: this.rng.range(2, 5), color,
      });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  _floater(x, y, text, color) {
    this.floaters.push({ x, y, text, color: color || '#eaf6ff', life: 1.4, maxLife: 1.4 });
    if (this.floaters.length > 12) this.floaters.shift();
  }

  // ------------------------------------------------------------ ambient

  updateAmbient(dt) {
    this.time += dt;
    for (const a of this.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.vr * dt;
      this._bounce(a, 1);
    }
    this._stepParticles(dt);
  }

  _bounce(e, restitution) {
    if (e.x < e.r) { e.x = e.r; e.vx = Math.abs(e.vx) * restitution; }
    if (e.x > VIEW_W - e.r) { e.x = VIEW_W - e.r; e.vx = -Math.abs(e.vx) * restitution; }
    if (e.y < e.r) { e.y = e.r; e.vy = Math.abs(e.vy) * restitution; }
    if (e.y > VIEW_H - e.r) { e.y = VIEW_H - e.r; e.vy = -Math.abs(e.vy) * restitution; }
  }

  _stepParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-1.2 * dt);
      p.vy *= Math.exp(-1.2 * dt);
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.y -= 34 * dt;
      f.life -= dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  // ------------------------------------------------------------ playing

  update(dt, input, sound) {
    this.time += dt;
    const ship = this.ship;
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.shieldT > 0) this.shieldT -= dt;
    if (this.magnetT > 0) this.magnetT -= dt;
    if (this.pulseCd > 0) this.pulseCd -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 30 * dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - 1.6 * dt);

    this.timer -= dt;
    if (this.timer <= 0) {
      this._timeUp(sound);
      return;
    }

    // --- steering
    const axis = input.axis();
    const boosting = input.boost && this.boost > 0;
    const accel = SHIP_ACCEL * (boosting ? BOOST_MULT : 1);
    ship.thrusting = axis.x !== 0 || axis.y !== 0;
    ship.boosting = boosting;
    if (ship.thrusting) {
      ship.vx += axis.x * accel * dt;
      ship.vy += axis.y * accel * dt;
    }
    if (boosting) {
      this.boost = Math.max(0, this.boost - BOOST_DRAIN * dt);
      if (!this.wasBoosting) sound.whoosh();
    } else {
      this.boost = Math.min(BOOST_MAX, this.boost + BOOST_REGEN * dt);
    }
    this.wasBoosting = boosting;
    const drag = input.brake ? 3.4 : SHIP_DRAG;
    const damp = Math.exp(-drag * dt);
    ship.vx *= damp;
    ship.vy *= damp;
    const maxSpeed = boosting ? BOOST_MAX_SPEED : SHIP_MAX_SPEED;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > maxSpeed) {
      ship.vx = (ship.vx / speed) * maxSpeed;
      ship.vy = (ship.vy / speed) * maxSpeed;
    }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    this._bounce(ship, 0.45);
    if (speed > 30) {
      const target = Math.atan2(ship.vy, ship.vx);
      let diff = target - ship.angle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      ship.angle += diff * Math.min(1, 12 * dt);
    }
    if (ship.thrusting) {
      const back = ship.angle + Math.PI;
      const n = boosting ? 4 : 2;
      for (let i = 0; i < n; i++) {
        this.particles.push({
          x: ship.x + Math.cos(back) * 18 + this.rng.range(-3, 3),
          y: ship.y + Math.sin(back) * 18 + this.rng.range(-3, 3),
          vx: Math.cos(back) * 120 + this.rng.range(-20, 20),
          vy: Math.sin(back) * 120 + this.rng.range(-20, 20),
          life: 0.35, maxLife: 0.35,
          size: this.rng.range(2, 4.5),
          color: boosting ? '#4de3ff' : '#ff8c42',
        });
      }
    }

    // --- tractor pulse (mouse click)
    if (input.consumeClick()) {
      if (this.pulseCd <= 0) {
        this.pulseCd = PULSE_COOLDOWN;
        sound.whoosh();
        this._burst(ship.x, ship.y, '#4de3ff', 18, 260, 0.5);
        for (const p of [...this.parcels, ...this.pickups]) {
          const d2 = dist2(p.x, p.y, ship.x, ship.y);
          if (d2 < PULSE_RADIUS * PULSE_RADIUS) {
            const d = Math.sqrt(d2) || 1;
            const pull = PULSE_PULL;
            if (p.vx !== undefined) {
              p.vx = ((ship.x - p.x) / d) * pull;
              p.vy = ((ship.y - p.y) / d) * pull;
            }
          }
        }
      }
    }

    // --- asteroids
    for (const a of this.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.vr * dt;
      this._bounce(a, 1);
    }

    // --- mines (level 3+)
    for (const m of this.mines) m.phase += dt * 2;

    // --- comets (level 5+)
    if (this.cometT !== Infinity) {
      this.cometT -= dt;
      if (this.cometT <= 0) {
        this.cometT = cometEvery(this.level);
        this._spawnComet();
      }
    }
    for (const c of this.comets) {
      if (c.warn > 0) {
        c.warn -= dt;
      } else {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      }
    }
    this.comets = this.comets.filter((c) => c.x > -120 && c.x < VIEW_W + 120 && c.y > -120 && c.y < VIEW_H + 120);

    // --- parcels and pickups drift
    for (const p of this.parcels) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.t += dt * 2;
      this._bounce(p, 1);
    }
    for (const p of this.pickups) {
      p.t += dt * 2;
      p.x += Math.sin(p.t) * 6 * dt;
      p.y += Math.cos(p.t * 0.8) * 6 * dt;
    }

    // --- magnet
    if (this.magnetT > 0) {
      for (const p of [...this.parcels, ...this.pickups]) {
        const d2 = dist2(p.x, p.y, ship.x, ship.y);
        if (d2 < MAGNET_RADIUS * MAGNET_RADIUS && d2 > 1) {
          const d = Math.sqrt(d2);
          const pull = 900 * dt;
          if (p.vx !== undefined) {
            p.vx += ((ship.x - p.x) / d) * pull;
            p.vy += ((ship.y - p.y) / d) * pull;
          } else {
            p.x += ((ship.x - p.x) / d) * pull * dt * 8;
            p.y += ((ship.y - p.y) / d) * pull * dt * 8;
          }
        }
      }
    }

    // --- spawns
    this.parcelT -= dt;
    if (this.parcelT <= 0) {
      this.parcelT = 5.5;
      if (this.parcels.length < 4) this._spawnParcel();
    }
    this.pickupT -= dt;
    if (this.pickupT <= 0) {
      this.pickupT = 13;
      if (this.pickups.length < 2) this._spawnPickup();
    }

    // --- delivery ring
    this.ring.phase += dt * 2;
    if (dist2(ship.x, ship.y, this.ring.x, this.ring.y) < RING_CATCH * RING_CATCH) {
      this._deliver(sound);
      if (this.clearPending) return;
    }

    // --- parcel pickup
    for (let i = this.parcels.length - 1; i >= 0; i--) {
      const p = this.parcels[i];
      if (dist2(p.x, p.y, ship.x, ship.y) < (SHIP_RADIUS + 14) * (SHIP_RADIUS + 14)) {
        this.parcels.splice(i, 1);
        this.score += 25;
        this._floater(p.x, p.y - 10, '+25', '#ffb703');
        this._burst(p.x, p.y, '#ffb703', 10, 160, 0.5);
        sound.blip();
      }
    }

    // --- power-up pickup
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (dist2(p.x, p.y, ship.x, ship.y) < (SHIP_RADIUS + 16) * (SHIP_RADIUS + 16)) {
        this.pickups.splice(i, 1);
        this._applyPickup(p.kind, p, sound);
      }
    }

    // --- hazards
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      const rr = a.r + SHIP_RADIUS - 4;
      if (dist2(a.x, a.y, ship.x, ship.y) < rr * rr) {
        if (this._damage(a.x, a.y, sound)) {
          // Shielded: shatter the rock.
          this.asteroids.splice(i, 1);
          this._burst(a.x, a.y, '#8d99ae', 16, 240, 0.7);
          this.asteroids.push(this._makeAsteroid(false));
        } else {
          // Bounce the rock away from the ship.
          const d = Math.sqrt(dist2(a.x, a.y, ship.x, ship.y)) || 1;
          a.vx = ((a.x - ship.x) / d) * 120;
          a.vy = ((a.y - ship.y) / d) * 120;
        }
      }
    }
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      const rr = m.r + SHIP_RADIUS - 4;
      if (dist2(m.x, m.y, ship.x, ship.y) < rr * rr) {
        if (this._damage(m.x, m.y, sound)) {
          this.mines.splice(i, 1);
          this._burst(m.x, m.y, '#ef476f', 16, 240, 0.7);
        }
      }
    }
    for (let i = this.comets.length - 1; i >= 0; i--) {
      const c = this.comets[i];
      if (c.warn > 0) continue;
      const rr = c.r + SHIP_RADIUS - 4;
      if (dist2(c.x, c.y, ship.x, ship.y) < rr * rr) {
        if (this._damage(c.x, c.y, sound)) {
          this.comets.splice(i, 1);
          this._burst(c.x, c.y, '#ffea00', 16, 240, 0.7);
        }
      }
    }
    if (this.overPending) return;

    this._stepParticles(dt);
  }

  _spawnComet() {
    const rng = this.rng;
    const edge = Math.floor(rng.next() * 4);
    let x, y, tx, ty;
    if (edge === 0) { x = rng.range(0, VIEW_W); y = -40; tx = rng.range(0, VIEW_W); ty = VIEW_H + 40; }
    else if (edge === 1) { x = rng.range(0, VIEW_W); y = VIEW_H + 40; tx = rng.range(0, VIEW_W); ty = -40; }
    else if (edge === 2) { x = -40; y = rng.range(0, VIEW_H); tx = VIEW_W + 40; ty = rng.range(0, VIEW_H); }
    else { x = VIEW_W + 40; y = rng.range(0, VIEW_H); tx = -40; ty = rng.range(0, VIEW_H); }
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = 520;
    this.comets.push({ x, y, vx: (dx / d) * speed, vy: (dy / d) * speed, r: 13, warn: 0.9 });
  }

  _applyPickup(kind, p, sound) {
    if (kind === 'shield') {
      this.shieldT = 20;
      this._floater(p.x, p.y - 10, 'SHIELD!', '#4de3ff');
    } else if (kind === 'repair') {
      this.hull = Math.min(HULL_MAX, this.hull + 1);
      this._floater(p.x, p.y - 10, 'HULL +1', '#7dff9e');
    } else if (kind === 'boost') {
      this.boost = Math.min(BOOST_MAX, this.boost + 60);
      this._floater(p.x, p.y - 10, 'BOOST +60', '#4de3ff');
    } else if (kind === 'magnet') {
      this.magnetT = 10;
      this._floater(p.x, p.y - 10, 'MAGNET!', '#ffb703');
    }
    this._burst(p.x, p.y, '#7dff9e', 12, 180, 0.5);
    sound.chime();
  }

  _deliver(sound) {
    const mult = comboMultiplier(this.combo);
    const points = Math.round(100 * mult);
    this.score += points;
    this.combo++;
    this.deliveriesDone++;
    this._floater(this.ring.x, this.ring.y - 30, `+${points}`, '#4de3ff');
    this._burst(this.ring.x, this.ring.y, '#4de3ff', 26, 300, 0.8);
    this._burst(this.ship.x, this.ship.y, '#ffe9a8', 10, 180, 0.5);
    sound.chime();
    if (this.deliveriesDone >= this.deliveriesNeeded) {
      const bonus = 250 + 10 * Math.ceil(this.timer);
      this.score += bonus;
      this.clearBonus = bonus;
      this.clearPending = true;
      sound.levelUp();
    } else {
      this._spawnRing();
    }
  }

  /** Returns true when a shield absorbed the hit. */
  _damage(hx, hy, sound) {
    if (this.invuln > 0) return false;
    const ship = this.ship;
    if (this.shieldT > 0) {
      this.shieldT = 0;
      this.invuln = 0.6;
      this._burst(ship.x, ship.y, '#4de3ff', 20, 260, 0.6);
      this._floater(ship.x, ship.y - 24, 'SHIELD DOWN', '#4de3ff');
      sound.thud();
      return true;
    }
    this.hull--;
    this.combo = 0;
    this.shake = 14;
    this.flash = 0.55;
    this.invuln = 1.4;
    const d = Math.sqrt(dist2(hx, hy, ship.x, ship.y)) || 1;
    ship.vx += ((ship.x - hx) / d) * 320;
    ship.vy += ((ship.y - hy) / d) * 320;
    this._burst(ship.x, ship.y, '#ff5d5d', 24, 300, 0.8);
    if (this.hull <= 0) {
      this._gameOver(sound);
    } else {
      sound.boom();
    }
    return false;
  }

  _timeUp(sound) {
    this.hull--;
    this.combo = 0;
    if (this.hull <= 0) {
      this._gameOver(sound);
      return;
    }
    sound.boom();
    this.buildLevel(this.level);
    this.banner = { text: 'TIME UP — HULL LOST', sub: `LEVEL ${this.level} — TRY AGAIN`, t: 2.4 };
  }

  _gameOver(sound) {
    this.finalScore = this.score;
    this.levelReached = this.level;
    this.best = Math.max(this.best, this.score);
    this.overPending = true;
    this._burst(this.ship.x, this.ship.y, '#ffd166', 40, 380, 1.1);
    this._burst(this.ship.x, this.ship.y, '#ff5d5d', 30, 300, 1.0);
    sound.boom();
  }

  nextLevel() {
    this.clearPending = false;
    this.buildLevel(this.level + 1);
  }
}
