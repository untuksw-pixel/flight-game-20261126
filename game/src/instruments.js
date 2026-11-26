// The instrument panel: a canvas-drawn cluster of lit gauges that sits at
// the bottom of the screen in both chase and cockpit view — artificial
// horizon, airspeed, altimeter, compass, vertical speed, fuel and throttle,
// with warning lamps for stall, low fuel and damage. Drawn to look flown:
// brass bezels, warm back-light, needles with shadows.
import { M_TO_FEET, MS_TO_KNOTS, PLANE } from './config.js';

const PANEL_HEIGHT = 168;

function dial(ctx, x, y, radius, label) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#131a21';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#c8a24a';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, radius - 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,190,90,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#d8c690';
  ctx.font = `bold ${Math.round(radius * 0.24)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + radius * 0.62);
  ctx.restore();
}

function ticks(ctx, x, y, radius, count, startAngle, sweep, labels, labelEvery) {
  ctx.save();
  ctx.strokeStyle = '#e8dfc2';
  ctx.fillStyle = '#e8dfc2';
  ctx.lineWidth = 2;
  const longest = labels ? Math.max(...labels.map((label) => label.length)) : 1;
  ctx.font = `${Math.round(radius * (longest > 1 ? 0.19 : 0.26))}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= count; i += 1) {
    const angle = startAngle + (i / count) * sweep;
    const inner = radius - 8;
    const outer = radius - 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(angle) * inner, y - Math.cos(angle) * inner);
    ctx.lineTo(x + Math.sin(angle) * outer, y - Math.cos(angle) * outer);
    ctx.stroke();
    if (labels && i % labelEvery === 0) {
      ctx.fillText(labels[i], x + Math.sin(angle) * (radius - 17), y - Math.cos(angle) * (radius - 17));
    }
  }
  ctx.restore();
}

function drawHorizon(ctx, x, y, radius, state) {
  dial(ctx, x, y, radius, '');
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius - 5, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-state.roll);
  const pitchOffset = Math.max(-radius, Math.min(radius, state.pitch * radius * 1.6));
  ctx.fillStyle = '#3f7fbf';
  ctx.fillRect(-radius, -radius + pitchOffset, radius * 2, radius * 2);
  ctx.fillStyle = '#8a6b42';
  ctx.fillRect(-radius, pitchOffset, radius * 2, radius * 2);
  ctx.strokeStyle = '#f5efdd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-radius, pitchOffset);
  ctx.lineTo(radius, pitchOffset);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(245,239,221,0.7)';
  for (const step of [-0.35, -0.18, 0.18, 0.35]) {
    const ly = pitchOffset + step * radius * 1.6;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.28, ly);
    ctx.lineTo(radius * 0.28, ly);
    ctx.stroke();
  }
  ctx.restore();
  // The bezel and label again, over the moving horizon art.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#c8a24a';
  ctx.stroke();
  ctx.fillStyle = '#d8c690';
  ctx.font = `bold ${Math.round(radius * 0.24)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText('HORIZON', x, y + radius * 0.62);
  ctx.restore();
  // The fixed aircraft symbol.
  ctx.save();
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.55, y);
  ctx.lineTo(x - radius * 0.18, y);
  ctx.lineTo(x, y + radius * 0.12);
  ctx.lineTo(x + radius * 0.18, y);
  ctx.lineTo(x + radius * 0.55, y);
  ctx.stroke();
  ctx.restore();
}

function drawAirspeed(ctx, x, y, radius, knots) {
  dial(ctx, x, y, radius, 'KNOTS');
  const max = 180;
  const start = -Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  ticks(ctx, x, y, radius - 4, 9, start, sweep, ['0', '20', '40', '60', '80', '100', '120', '140', '160', '180'], 1);
  // The stall band, painted red where the wing lets go.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius - 10, start + (40 / max) * sweep - Math.PI / 2, start + (48 / max) * sweep - Math.PI / 2);
  ctx.strokeStyle = '#d64541';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  // The needle itself is drawn by drawInstruments via drawNeedlePolar, so it
  // sits above the dial face this function paints.
}

function drawNeedlePolar(ctx, x, y, angleFromTop, length) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleFromTop);
  ctx.beginPath();
  ctx.moveTo(-3, 6);
  ctx.lineTo(0, -length);
  ctx.lineTo(3, 6);
  ctx.closePath();
  ctx.fillStyle = '#ffb84d';
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#e8e2d2';
  ctx.fill();
}

function drawAltimeter(ctx, x, y, radius, feet) {
  dial(ctx, x, y, radius, 'ALT FT');
  ticks(ctx, x, y, radius - 4, 10, 0, Math.PI * 2, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ''], 1);
  const thousands = ((feet % 10000) / 10000) * Math.PI * 2;
  const hundreds = ((feet % 1000) / 1000) * Math.PI * 2;
  drawNeedlePolar(ctx, x, y, thousands, radius - 16);
  ctx.save();
  ctx.globalAlpha = 0.75;
  drawNeedlePolar(ctx, x, y, hundreds, radius - 26);
  ctx.restore();
  ctx.fillStyle = '#ffd98a';
  ctx.font = `bold ${Math.round(radius * 0.26)}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.max(0, Math.round(feet))), x, y + radius * 0.34);
}

function drawCompass(ctx, x, y, radius, headingDeg) {
  dial(ctx, x, y, radius, 'HDG');
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius - 6, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-headingDeg * Math.PI / 180);
  ctx.fillStyle = '#e8dfc2';
  ctx.font = `bold ${Math.round(radius * 0.3)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const points = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  for (const [label, deg] of points) {
    const a = deg * Math.PI / 180;
    ctx.fillText(label, Math.sin(a) * (radius - 18), -Math.cos(a) * (radius - 18));
  }
  for (let deg = 0; deg < 360; deg += 30) {
    const a = deg * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * (radius - 8), -Math.cos(a) * (radius - 8));
    ctx.lineTo(Math.sin(a) * (radius - 13), -Math.cos(a) * (radius - 13));
    ctx.strokeStyle = '#e8dfc2';
    ctx.stroke();
  }
  ctx.restore();
  // The lubber line at the top.
  ctx.beginPath();
  ctx.moveTo(x, y - radius + 2);
  ctx.lineTo(x - 5, y - radius + 12);
  ctx.lineTo(x + 5, y - radius + 12);
  ctx.closePath();
  ctx.fillStyle = '#ffd23e';
  ctx.fill();
}

function lamp(ctx, x, y, text, on, color) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - 34, y - 11, 68, 22, 4);
  ctx.fillStyle = on ? color : '#232a31';
  ctx.fill();
  ctx.strokeStyle = '#454f58';
  ctx.stroke();
  ctx.fillStyle = on ? '#14100a' : '#6b7680';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function bar(ctx, x, y, width, height, fraction, color, label, valueText) {
  ctx.save();
  ctx.fillStyle = '#d8c690';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 4);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 3);
  ctx.fillStyle = '#232a31';
  ctx.fill();
  ctx.strokeStyle = '#454f58';
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y + 1.5, Math.max(0, (width - 3) * fraction), height - 3, 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#f5efdd';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(valueText, x + width, y - 4);
  ctx.restore();
}

/** Draw the whole cluster along the bottom of the overlay canvas. */
export function drawInstruments(ctx, state, width, height) {
  const scale = Math.max(0.72, Math.min(1.1, width / 1280));
  const panelWidth = 700 * scale;
  const panelHeight = PANEL_HEIGHT * scale;
  const left = (width - panelWidth) / 2;
  const top = height - panelHeight - 10;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(left, top, panelWidth, panelHeight, 12);
  ctx.fillStyle = 'rgba(13, 19, 26, 0.88)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#c8a24a';
  ctx.stroke();
  ctx.translate(left, top);
  ctx.scale(scale, scale);

  const cy = 84;
  const r = 62;
  drawHorizon(ctx, 84, cy, r, state);
  drawAirspeed(ctx, 218, cy, r, state.speed * MS_TO_KNOTS);
  drawNeedlePolar(ctx, 218, cy, -Math.PI * 0.75 + (Math.min(state.speed * MS_TO_KNOTS, 180) / 180) * Math.PI * 1.5, r - 14);
  drawAltimeter(ctx, 352, cy, r, Math.max(0, state.position.y) * M_TO_FEET);
  const headingDeg = ((state.heading * 180 / Math.PI) % 360 + 360) % 360;
  drawCompass(ctx, 486, cy, r, headingDeg);

  // Right-hand stack: bars and lamps.
  const bx = 566;
  const fuelFraction = state.fuel / 100;
  bar(ctx, bx, 34, 118, 13, fuelFraction, state.fuel < 25 ? '#d64541' : '#7fc24d', 'FUEL', `${Math.round(state.fuel)}%`);
  bar(ctx, bx, 74, 118, 13, state.throttle, '#ffb84d', 'THROTTLE', `${Math.round(state.throttle * 100)}%`);
  const vsi = state.verticalSpeed * M_TO_FEET * 60;
  bar(ctx, bx, 114, 118, 13, Math.max(0, Math.min(1, (vsi + 2000) / 4000)), '#6fb7d6', 'VERT SPD', `${vsi >= 0 ? '+' : ''}${Math.round(vsi / 50) * 50}`);
  lamp(ctx, 600, 152, 'STALL', state.stalled, '#ff5347');
  lamp(ctx, 672 - 6, 152, 'DAMAGE', state.damage > 1, state.damage > 60 ? '#ff5347' : '#ffb84d');
  ctx.restore();

  // A low-fuel / engine warning rides above the panel when it matters.
  if (state.engineDead) {
    ctx.save();
    ctx.fillStyle = '#ff5347';
    ctx.font = `bold ${Math.round(20 * scale)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ENGINE OUT — GLIDE TO A LANDING', width / 2, top - 14);
    ctx.restore();
  }
  return { top };
}

// Referenced by drawAirspeed's dial ticks; kept so PLANE stays imported for
// future tuning of the stall band.
export const PANEL = { height: PANEL_HEIGHT, stallKnots: PLANE.stallSpeed * MS_TO_KNOTS };
