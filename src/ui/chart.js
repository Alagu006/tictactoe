/**
 * @fileoverview Progress chart UI component: renders a responsive SVG
 * line chart illustrating prediction accuracy and mistake trends over time.
 */

import { CHART_WINDOW_SIZE } from '../constants.js';

const CHART_CONFIG = Object.freeze({
  WIDTH: 330,
  HEIGHT: 120,
  ORIGIN_X: 40,
  TOP_Y: 18,
  BOTTOM_Y: 138
});

/**
 * Computes plotted point coordinates for accuracy and mistakes.
 * @param {ReadonlyArray<object>} recentMatches - Recent matches.
 * @param {number} maxMistakes - Maximum mistakes for Y-scale.
 * @returns {{ accPts: Array<{x: number, y: number}>, misPts: Array<{x: number, y: number}> }}
 */
function computePoints(recentMatches, maxMistakes) {
  const count = recentMatches.length;
  const { WIDTH, HEIGHT, ORIGIN_X, BOTTOM_Y } = CHART_CONFIG;
  const getX = (idx) => count === 1 ? ORIGIN_X + WIDTH / 2 : ORIGIN_X + (idx / (count - 1)) * WIDTH;
  const getYAcc = (acc) => BOTTOM_Y - (Math.min(100, Math.max(0, acc)) / 100) * HEIGHT;
  const getYMis = (mis) => BOTTOM_Y - (Math.min(maxMistakes, Math.max(0, mis)) / maxMistakes) * HEIGHT;

  const accPts = recentMatches.map((m, idx) => ({ x: getX(idx), y: getYAcc(m.accuracy) }));
  const misPts = recentMatches.map((m, idx) => ({ x: getX(idx), y: getYMis(m.mistakes) }));
  return { accPts, misPts };
}

/**
 * Builds SVG background grid lines and axis label texts.
 * @param {number} maxMistakes - Max mistakes value for right axis.
 * @returns {string} SVG markup.
 */
function buildGridAndAxes(maxMistakes) {
  const { WIDTH, ORIGIN_X, TOP_Y, BOTTOM_Y } = CHART_CONFIG;
  const midY = (TOP_Y + BOTTOM_Y) / 2;
  const rightX = ORIGIN_X + WIDTH;

  return `
    <line x1="${ORIGIN_X}" y1="${TOP_Y}" x2="${rightX}" y2="${TOP_Y}" stroke="var(--line)" stroke-dasharray="3 3"/>
    <line x1="${ORIGIN_X}" y1="${midY}" x2="${rightX}" y2="${midY}" stroke="var(--line)" stroke-dasharray="3 3"/>
    <line x1="${ORIGIN_X}" y1="${BOTTOM_Y}" x2="${rightX}" y2="${BOTTOM_Y}" stroke="var(--line)"/>

    <text x="${ORIGIN_X - 8}" y="${TOP_Y + 4}" text-anchor="end" fill="var(--muted)" font-size="10" font-family="inherit">100%</text>
    <text x="${ORIGIN_X - 8}" y="${midY + 4}" text-anchor="end" fill="var(--muted)" font-size="10" font-family="inherit">50%</text>
    <text x="${ORIGIN_X - 8}" y="${BOTTOM_Y + 4}" text-anchor="end" fill="var(--muted)" font-size="10" font-family="inherit">0%</text>

    <text x="${rightX + 8}" y="${TOP_Y + 4}" text-anchor="start" fill="var(--muted)" font-size="10" font-family="inherit">${maxMistakes}m</text>
    <text x="${rightX + 8}" y="${BOTTOM_Y + 4}" text-anchor="start" fill="var(--muted)" font-size="10" font-family="inherit">0m</text>
  `;
}

/**
 * Builds SVG circle symbols for all accuracy and mistake points.
 * @param {ReadonlyArray<object>} matches - Matches list.
 * @param {Array<{x: number, y: number}>} accPts - Accuracy coordinates.
 * @param {Array<{x: number, y: number}>} misPts - Mistake coordinates.
 * @returns {string} SVG circle elements.
 */
function buildSvgCircles(matches, accPts, misPts) {
  return matches.map((m, idx) => {
    const tip = `Match ${m.match}: ${m.accuracy}% accuracy, ${m.mistakes} ${m.mistakes === 1 ? 'mistake' : 'mistakes'}`;
    const acc = accPts[idx];
    const mis = misPts[idx];
    return `
      <circle class="chart-point" cx="${acc.x.toFixed(1)}" cy="${acc.y.toFixed(1)}" r="4"
              fill="var(--surface)" stroke="var(--x)" stroke-width="2.5" role="graphics-symbol"
              tabindex="0" data-tip="${tip}" aria-label="${tip}"><title>${tip}</title></circle>
      <circle class="chart-point" cx="${mis.x.toFixed(1)}" cy="${mis.y.toFixed(1)}" r="4"
              fill="var(--surface)" stroke="var(--bad)" stroke-width="2.5" role="graphics-symbol"
              tabindex="0" data-tip="${tip}" aria-label="${tip}"><title>${tip}</title></circle>
    `;
  }).join('');
}

/**
 * Builds connected polyline paths for the chart.
 * @param {Array<{x: number, y: number}>} points - Point coordinates.
 * @param {string} strokeColor - CSS color token.
 * @param {boolean} isDashed - Whether line is dashed.
 * @returns {string} SVG path markup.
 */
function buildPathMarkup(points, strokeColor, isDashed) {
  if (points.length <= 1) return '';
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const dashAttr = isDashed ? 'stroke-dasharray="4 3"' : '';
  return `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" ${dashAttr}/>`;
}

/**
 * Attaches tooltip listeners to chart point symbols.
 * @param {HTMLElement} container - Chart container element.
 */
function bindChartTooltips(container) {
  container.querySelectorAll('.chart-point').forEach(point => {
    const show = () => {
      const tipText = point.getAttribute('data-tip');
      const tipBox = container.querySelector('#chartTip');
      if (tipText && tipBox) tipBox.textContent = tipText;
    };
    point.addEventListener('mouseenter', show);
    point.addEventListener('focus', show);
  });
}

/**
 * Renders the progress trend line chart.
 * @param {HTMLElement} container - DOM element to render into.
 * @param {ReadonlyArray<object>} matchHistory - Array of match records.
 */
export function renderProgressChart(container, matchHistory) {
  if (!container) return;
  const data = matchHistory || [];
  if (!data.length) {
    container.innerHTML = '<h2>Prediction & Mistakes Trend</h2><p class="muted">Finish your first match to start tracking your prediction accuracy and mistake trends over time.</p>';
    return;
  }

  const recent = data.slice(-CHART_WINDOW_SIZE);
  const maxMistakes = Math.max(3, ...recent.map(m => m.mistakes || 0));
  const { accPts, misPts } = computePoints(recent, maxMistakes);
  const gridHtml = buildGridAndAxes(maxMistakes);
  const accPath = buildPathMarkup(accPts, 'var(--x)', false);
  const misPath = buildPathMarkup(misPts, 'var(--bad)', true);
  const circlesHtml = buildSvgCircles(recent, accPts, misPts);
  const latest = recent[recent.length - 1];
  const initialTip = `Match ${latest.match}: ${latest.accuracy}% accuracy, ${latest.mistakes} ${latest.mistakes === 1 ? 'mistake' : 'mistakes'}`;

  container.innerHTML = `
    <h2>Prediction & Mistakes Trend</h2>
    <p class="muted">Per-match combined accuracy and mistakes (${recent.length === 1 ? '1 match' : `last ${recent.length} matches`}):</p>
    <div class="chart-box">
      <svg class="chart-svg" viewBox="0 0 410 165" role="img" aria-label="Line chart showing prediction accuracy and mistake trends per match">
        ${gridHtml}${accPath}${misPath}${circlesHtml}
      </svg>
      <div class="chart-tip" id="chartTip" aria-live="polite">${initialTip}</div>
      <div class="chart-legend">
        <span class="legend-item"><span class="legend-dot acc"></span> Combined prediction accuracy (%)</span>
        <span class="legend-item"><span class="legend-dot mis"></span> Mistakes</span>
      </div>
    </div>
  `;
  bindChartTooltips(container);
}
