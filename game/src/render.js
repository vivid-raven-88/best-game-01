// Drawing. One job: every pixel the player sees, from the sky to the HUD.
import { VIEW_W, VIEW_H, SHIP_RADIUS, HULL_MAX, BOOST_MAX, comboMultiplier, deliveriesForLevel } from './config.js';

const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function pad6(n) {
  return String(Math.max(0, Math.floor(n))).padStart(6, '0');
}

function fmtTime(t) {
  const s = Math.max(0, Math.ceil(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function font(weight, size) {
  return `${weight} ${size}px "Segoe UI", system-ui, sans-serif`;
}

export function draw(ctx, world, view) {
  const { mode } = view;
  ctx.save();
  if (world.shake > 0.2) {
    const s = world.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawSky(ctx, world);
  drawRing(ctx, world, mode);
  drawParcels(ctx, world);
  drawPickups(ctx, world);
  drawMines(ctx, world);
  drawComets(ctx, world);
  drawAsteroids(ctx, world);
  if (mode !== 'gameover') drawShip(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();

  if (mode === 'playing' || mode === 'paused' || mode === 'levelclear') drawHud(ctx, world, view);
  drawBanner(ctx, world);
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 40, 40, ${(world.flash * 0.35).toFixed(3)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (mode === 'title') drawTitle(ctx, world);
  else if (mode === 'levelclear') drawLevelClear(ctx, world, view);
  else if (mode === 'gameover') drawGameOver(ctx, world);
  else if (mode === 'paused') drawPaused(ctx);
}

function drawSky(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#0b1030');
  g.addColorStop(0.55, '#2a1650');
  g.addColorStop(1, '#7a2d5e');
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of world.nebula) {
    const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    rg.addColorStop(0, b.color + Math.round(b.alpha * 255).toString(16).padStart(2, '0'));
    rg.addColorStop(1, b.color + '00');
    ctx.fillStyle = rg;
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
  ctx.restore();
  for (const s of world.stars) {
    const tw = 0.55 + 0.45 * Math.sin(world.time * 1.6 + s.phase);
    ctx.globalAlpha = tw * (0.35 + s.layer * 0.5);
    ctx.fillStyle = '#eaf6ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRing(ctx, world, mode) {
  const ring = world.ring;
  if (!ring) return;
  const pulse = 0.5 + 0.5 * Math.sin(ring.phase);
  ctx.save();
  const glow = ctx.createRadialGradient(ring.x, ring.y, 0, ring.x, ring.y, 78);
  glow.addColorStop(0, 'rgba(77, 227, 255, 0.22)');
  glow.addColorStop(1, 'rgba(77, 227, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(ring.x - 78, ring.y - 78, 156, 156);
  ctx.strokeStyle = '#4de3ff';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  ctx.lineDashOffset = -ring.phase * 18;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(184, 246, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.r - 10, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#b8f6ff';
  ctx.font = font(700, 13);
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.65 + 0.35 * pulse;
  ctx.fillText('DELIVER', ring.x, ring.y + ring.r + 22);
  ctx.restore();
  if (mode === 'playing') {
    const ship = world.ship;
    ctx.save();
    ctx.strokeStyle = 'rgba(234, 246, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 9]);
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y);
    ctx.lineTo(ring.x, ring.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParcels(ctx, world) {
  for (const p of world.parcels) {
    const bob = Math.sin(p.t) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.shadowColor = '#ffb703';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffb703';
    rr(ctx, -8, -8, 16, 16, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#7a4d00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 8);
    ctx.stroke();
    ctx.restore();
  }
}

const PICKUP_STYLE = {
  shield: { color: '#4de3ff', letter: 'S' },
  repair: { color: '#7dff9e', letter: 'R' },
  boost: { color: '#ffea00', letter: 'B' },
  magnet: { color: '#ffb703', letter: 'M' },
};

function drawPickups(ctx, world) {
  for (const p of world.pickups) {
    const st = PICKUP_STYLE[p.kind];
    const pulse = 0.6 + 0.4 * Math.sin(p.t * 3);
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(p.t) * 2);
    ctx.globalAlpha = 0.5 * pulse;
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0b1030';
    ctx.font = font(800, 13);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.letter, 0, 1);
    ctx.restore();
  }
}

function drawMines(ctx, world) {
  for (const m of world.mines) {
    const pulse = 0.5 + 0.5 * Math.sin(m.phase);
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = '#2a0e1a';
    ctx.strokeStyle = '#ef476f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + m.phase * 0.2;
      const x1 = Math.cos(a) * m.r;
      const y1 = Math.sin(a) * m.r;
      const x2 = Math.cos(a + 0.3) * (m.r * 0.55);
      const y2 = Math.sin(a + 0.3) * (m.r * 0.55);
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `rgba(239, 71, 111, ${0.55 + 0.45 * pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, 6 + 2 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawComets(ctx, world) {
  for (const c of world.comets) {
    if (c.warn > 0) {
      const len = Math.hypot(c.vx, c.vy) || 1;
      const nx = c.vx / len;
      const ny = c.vy / len;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 234, 0, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + nx * 700, c.y + ny * 700);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffea00';
      ctx.font = font(800, 20);
      ctx.textAlign = 'center';
      ctx.fillText('!', c.x, c.y - 18);
      ctx.restore();
    } else {
      const len = Math.hypot(c.vx, c.vy) || 1;
      const nx = c.vx / len;
      const ny = c.vy / len;
      const grad = ctx.createLinearGradient(c.x, c.y, c.x - nx * 110, c.y - ny * 110);
      grad.addColorStop(0, 'rgba(255, 234, 0, 0.95)');
      grad.addColorStop(1, 'rgba(255, 234, 0, 0)');
      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x - nx * 110, c.y - ny * 110);
      ctx.stroke();
      ctx.fillStyle = '#fffbe0';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 9, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawAsteroids(ctx, world) {
  for (const a of world.asteroids) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.beginPath();
    const n = a.verts.length;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU;
      const r = a.r * a.verts[i];
      if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#8d99ae';
    ctx.fill();
    ctx.strokeStyle = '#5c6675';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(92, 102, 117, 0.8)';
    ctx.beginPath();
    ctx.arc(a.r * 0.25, a.r * 0.15, a.r * 0.16, 0, TAU);
    ctx.arc(-a.r * 0.3, -a.r * 0.2, a.r * 0.12, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawShip(ctx, world) {
  const ship = world.ship;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  if (world.invuln > 0) {
    ctx.globalAlpha = 0.45 + 0.35 * Math.sin(world.time * 30);
  }
  if (ship.thrusting) {
    const flick = 14 + 9 * Math.sin(world.time * 42) + (ship.boosting ? 12 : 0);
    ctx.fillStyle = ship.boosting ? '#4de3ff' : '#ff8c42';
    ctx.beginPath();
    ctx.moveTo(-13, 5);
    ctx.lineTo(-13 - flick, 0);
    ctx.lineTo(-13, -5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#ff8c42';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(-14, 13);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-14, -13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b8f6ff';
  ctx.beginPath();
  ctx.arc(7, 0, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (world.shieldT > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(77, 227, 255, ${0.5 + 0.3 * Math.sin(world.time * 6)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, 28, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of world.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloaters(ctx, world) {
  ctx.save();
  ctx.font = font(800, 15);
  ctx.textAlign = 'center';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

function drawHud(ctx, world, view) {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9db8d6';
  ctx.font = font(700, 12);
  ctx.fillText('SCORE', 24, 30);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = font(800, 26);
  ctx.fillText(pad6(world.score), 24, 58);
  const mult = comboMultiplier(world.combo);
  ctx.fillStyle = world.combo >= 2 ? '#ffd166' : '#9db8d6';
  ctx.font = font(700, 14);
  ctx.fillText(`COMBO ×${mult.toFixed(1)}`, 24, 80);
  // Level and delivery pips, top center.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = font(800, 20);
  ctx.fillText(`LEVEL ${world.level}`, VIEW_W / 2, 34);
  const needed = world.deliveriesNeeded;
  const totalW = needed * 18;
  for (let i = 0; i < needed; i++) {
    const x = VIEW_W / 2 - totalW / 2 + i * 18 + 9;
    ctx.beginPath();
    ctx.arc(x, 52, 6, 0, TAU);
    if (i < world.deliveriesDone) {
      ctx.fillStyle = '#4de3ff';
      ctx.fill();
    } else {
      ctx.strokeStyle = '#9db8d6';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  // Timer, top right.
  const low = world.timer < 10;
  ctx.textAlign = 'right';
  ctx.fillStyle = low ? '#ff5d5d' : '#eaf6ff';
  ctx.font = font(800, 26);
  ctx.globalAlpha = low ? 0.65 + 0.35 * Math.sin(world.time * 8) : 1;
  ctx.fillText(fmtTime(world.timer), VIEW_W - 24, 58);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#9db8d6';
  ctx.font = font(700, 12);
  ctx.fillText('TIME', VIEW_W - 24, 30);
  // Hull, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9db8d6';
  ctx.font = font(700, 12);
  ctx.fillText('HULL', 24, VIEW_H - 44);
  for (let i = 0; i < HULL_MAX; i++) {
    ctx.save();
    ctx.translate(34 + i * 26, VIEW_H - 26);
    ctx.fillStyle = i < world.hull ? '#ffd166' : 'rgba(157, 184, 214, 0.25)';
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-7, 6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, -6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Boost bar, bottom right.
  const bw = 130;
  const bx = VIEW_W - 24 - bw;
  ctx.fillStyle = '#9db8d6';
  ctx.font = font(700, 12);
  ctx.textAlign = 'right';
  ctx.fillText('BOOST — SPACE', VIEW_W - 24, VIEW_H - 44);
  ctx.fillStyle = 'rgba(157, 184, 214, 0.25)';
  rr(ctx, bx, VIEW_H - 36, bw, 10, 5);
  ctx.fill();
  ctx.fillStyle = world.boost > 25 ? '#4de3ff' : '#ff5d5d';
  rr(ctx, bx, VIEW_H - 36, bw * (world.boost / BOOST_MAX), 10, 5);
  ctx.fill();
  ctx.fillStyle = world.pulseCd <= 0 ? '#7dff9e' : '#9db8d6';
  ctx.font = font(700, 12);
  ctx.fillText(world.pulseCd <= 0 ? 'PULSE READY — CLICK' : `PULSE ${world.pulseCd.toFixed(1)}s`, VIEW_W - 24, VIEW_H - 12);
  // Hint, bottom center.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(234, 246, 255, 0.5)';
  ctx.font = font(600, 12);
  ctx.fillText('WASD THRUST · SPACE BOOST · SHIFT BRAKE · CLICK TRACTOR PULSE · P PAUSE · M MUTE', VIEW_W / 2, VIEW_H - 12);
  ctx.restore();
}

function drawBanner(ctx, world) {
  if (!world.banner) return;
  const b = world.banner;
  ctx.save();
  ctx.globalAlpha = Math.min(1, b.t);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = font(800, 24);
  ctx.fillText(b.text, VIEW_W / 2, 108);
  ctx.fillStyle = '#9db8d6';
  ctx.font = font(600, 15);
  ctx.fillText(b.sub, VIEW_W / 2, 132);
  ctx.restore();
}

function drawTitle(ctx, world) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, 'rgba(5, 8, 24, 0.45)');
  g.addColorStop(1, 'rgba(5, 8, 24, 0.82)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  const tg = ctx.createLinearGradient(VIEW_W / 2 - 320, 0, VIEW_W / 2 + 320, 0);
  tg.addColorStop(0, '#ffd166');
  tg.addColorStop(0.5, '#ffe9a8');
  tg.addColorStop(1, '#ff8c42');
  ctx.fillStyle = tg;
  ctx.font = font(800, 76);
  try { ctx.letterSpacing = '6px'; } catch (_) {}
  ctx.fillText('COMET COURIER', VIEW_W / 2, 250);
  try { ctx.letterSpacing = '0px'; } catch (_) {}
  ctx.fillStyle = '#4de3ff';
  ctx.font = font(700, 20);
  try { ctx.letterSpacing = '10px'; } catch (_) {}
  ctx.fillText('P A R C E L   R U N', VIEW_W / 2, 292);
  try { ctx.letterSpacing = '0px'; } catch (_) {}
  ctx.fillStyle = '#eaf6ff';
  ctx.font = font(600, 16);
  ctx.fillText('Fly the rings, dodge the rocks, deliver the parcels before the clock runs out.', VIEW_W / 2, 350);
  ctx.fillStyle = '#9db8d6';
  ctx.font = font(600, 15);
  const lines = [
    'WASD / ARROWS — thrust      SPACE — boost      SHIFT — brake',
    'CLICK — tractor pulse (pulls parcels to you)      P — pause      M — mute',
  ];
  ctx.fillText(lines[0], VIEW_W / 2, 396);
  ctx.fillText(lines[1], VIEW_W / 2, 420);
  const blink = 0.75 + 0.25 * Math.sin(world.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffd166';
  ctx.font = font(800, 22);
  ctx.fillText('PRESS ENTER OR CLICK TO LAUNCH', VIEW_W / 2, 490);
  ctx.globalAlpha = 1;
  if (world.best > 0) {
    ctx.fillStyle = '#9db8d6';
    ctx.font = font(700, 14);
    ctx.fillText(`BEST ${pad6(world.best)}`, VIEW_W / 2, 524);
  }
  ctx.fillStyle = 'rgba(234, 246, 255, 0.45)';
  ctx.font = font(600, 13);
  ctx.fillText('A tiny courier. A whole asteroid field. One clock.', VIEW_W / 2, 668);
  ctx.restore();
}

function drawLevelClear(ctx, world, view) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 24, 0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = font(800, 54);
  ctx.fillText(`LEVEL ${world.level} CLEAR!`, VIEW_W / 2, 300);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = font(700, 24);
  ctx.fillText(`TIME BONUS +${world.clearBonus || 0}`, VIEW_W / 2, 348);
  const blink = 0.75 + 0.25 * Math.sin(world.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#4de3ff';
  ctx.font = font(700, 18);
  ctx.fillText(`NEXT: LEVEL ${world.level + 1} — PRESS ENTER`, VIEW_W / 2, 400);
  ctx.restore();
}

function drawGameOver(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 24, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d5d';
  ctx.font = font(800, 64);
  ctx.fillText('GAME OVER', VIEW_W / 2, 290);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = font(800, 30);
  ctx.fillText(`FINAL SCORE ${pad6(world.finalScore)}`, VIEW_W / 2, 348);
  ctx.fillStyle = '#9db8d6';
  ctx.font = font(700, 18);
  ctx.fillText(`REACHED LEVEL ${world.levelReached}  ·  BEST ${pad6(world.best)}`, VIEW_W / 2, 384);
  const blink = 0.75 + 0.25 * Math.sin(world.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffd166';
  ctx.font = font(800, 22);
  ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', VIEW_W / 2, 448);
  ctx.restore();
}

function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 24, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = font(800, 48);
  ctx.fillText('PAUSED', VIEW_W / 2, 340);
  ctx.fillStyle = '#9db8d6';
  ctx.font = font(700, 18);
  ctx.fillText('P TO RESUME', VIEW_W / 2, 380);
  ctx.restore();
}
