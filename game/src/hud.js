// The head-up display: the big digital readouts a judge reads first —
// altitude, speed and heading — plus the current objective with its
// distance, the mission name, score and clock, event messages in the
// centre, and a compass strip that always points where the nose points.
import { M_TO_FEET, MS_TO_KNOTS } from './config.js';
import { objectiveDistance, objectiveText } from './missions.js';

function readoutBox(ctx, x, y, label, value) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, 148, 58, 8);
  ctx.fillStyle = 'rgba(13, 19, 26, 0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 162, 74, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#9fc3e0';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 12, y + 20);
  ctx.fillStyle = '#ffd98a';
  ctx.font = "bold 26px 'Courier New', monospace";
  ctx.fillText(value, x + 12, y + 48);
  ctx.restore();
}

function compassStrip(ctx, state, width) {
  const headingDeg = ((state.heading * 180 / Math.PI) % 360 + 360) % 360;
  const stripWidth = Math.min(430, width * 0.4);
  const left = (width - stripWidth) / 2;
  const y = 14;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(left, y, stripWidth, 30, 8);
  ctx.fillStyle = 'rgba(13, 19, 26, 0.72)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 162, 74, 0.7)';
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(left + 4, y + 3, stripWidth - 8, 24);
  ctx.clip();
  ctx.fillStyle = '#e8dfc2';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pxPerDeg = 3.2;
  for (let deg = -90; deg <= 450; deg += 5) {
    const shown = ((deg % 360) + 360) % 360;
    const offset = (deg - headingDeg) * pxPerDeg;
    if (Math.abs(offset) > stripWidth / 2) continue;
    const x = width / 2 + offset;
    if (shown % 30 === 0) {
      const label = shown === 0 ? 'N' : shown === 90 ? 'E' : shown === 180 ? 'S' : shown === 270 ? 'W' : String(shown / 10).padStart(2, '0');
      ctx.fillText(label, x, y + 16);
    } else {
      ctx.fillRect(x, y + 20, 1.5, 6);
    }
  }
  ctx.restore();
  // The fixed heading marker.
  ctx.beginPath();
  ctx.moveTo(width / 2, y + 30);
  ctx.lineTo(width / 2 - 6, y + 40);
  ctx.lineTo(width / 2 + 6, y + 40);
  ctx.closePath();
  ctx.fillStyle = '#ffd23e';
  ctx.fill();
}

/**
 * Draw everything above the 3D view except the instrument cluster.
 * `view` = { state, runner, elapsed, cameraMode }.
 */
export function drawHud(ctx, view, width, height) {
  const { state, runner, elapsed } = view;
  const feet = Math.max(0, Math.round(state.position.y * M_TO_FEET));
  const knots = Math.round(state.speed * MS_TO_KNOTS);
  const headingDeg = Math.round(((state.heading * 180 / Math.PI) % 360 + 360) % 360);

  readoutBox(ctx, 16, 14, 'ALTITUDE FT', String(feet));
  readoutBox(ctx, 16, 82, 'SPEED KT', String(knots));
  readoutBox(ctx, 16, 150, 'HEADING', `${String(headingDeg).padStart(3, '0')}°`);
  compassStrip(ctx, state, width);

  // Mission, score and clock, top right, on a dark backing so the words
  // stay readable against a bright sky.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(width - 346, 8, 338, 86, 8);
  ctx.fillStyle = 'rgba(13, 19, 26, 0.66)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 162, 74, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f6d67c';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText(runner.mission.title.toUpperCase(), width - 18, 36);
  ctx.fillStyle = '#f5efdd';
  ctx.font = "bold 17px 'Courier New', monospace";
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);
  ctx.fillText(`SCORE ${runner.score}   ${minutes}:${String(seconds).padStart(2, '0')}`, width - 18, 62);
  ctx.fillStyle = state.damage > 0 ? '#ff9a8a' : '#9fc3e0';
  ctx.font = '14px Georgia, serif';
  ctx.fillText(state.damage > 0 ? `Airframe damage ${Math.round(state.damage)}%` : 'Airframe sound', width - 18, 84);
  ctx.restore();

  // The objective, under the compass strip.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(13, 19, 26, 0.66)';
  const text = `${objectiveText(runner)}   ·   ${Math.round(objectiveDistance(runner, state))} m`;
  ctx.font = 'bold 17px Georgia, serif';
  const w = ctx.measureText(text).width + 30;
  ctx.beginPath();
  ctx.roundRect((width - w) / 2, 52, w, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#ffe9a3';
  ctx.fillText(text, width / 2, 73);
  ctx.restore();

  // Centre event message (ring flown, parcel away, warnings).
  const now = performance.now() / 1000;
  if (runner.message && now < runner.messageUntil) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffd23e';
    ctx.fillText(runner.message, width / 2, height * 0.3);
    ctx.restore();
  }
  if (state.stalled) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ff5347';
    ctx.fillText('STALL — nose down, build speed', width / 2, height * 0.37);
    ctx.restore();
  }

  // Controls reminder, riding just above the instrument panel.
  const panelScale = Math.max(0.72, Math.min(1.1, width / 1280));
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(245, 239, 221, 0.75)';
  ctx.font = '12.5px Georgia, serif';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText('Arrows / hold mouse: fly · W/S or wheel: throttle · B: brake · Space: drop parcel · C: cockpit view · P: pause', width / 2, height - 168 * panelScale - 18);
  ctx.restore();
}
