/**
 * @fileoverview Habits UI component: renders the move frequency grid,
 * mistake heatmap grid, and lifetime prediction accuracy bars.
 */

import { ALGORITHM_KEYS, ALGORITHM_NAMES, BOARD_CELLS } from '../constants.js';
import { formatCoordinates } from '../game.js';

/**
 * Creates an accuracy bar markup string.
 * @param {string} label - Display label.
 * @param {number} hits - Correct predictions.
 * @param {number} total - Total predictions evaluated.
 * @returns {string} HTML markup string.
 */
function createProgressBar(label, hits, total) {
  const percentage = total ? Math.round((100 * hits) / total) : 0;
  return `
    <div class="bar">
      <span>${label}</span>
      <i><u style="width:${percentage}%"></u></i>
      <span>${percentage}%</span>
    </div>
  `;
}

/**
 * Builds the 3x3 move frequency grid HTML.
 * @param {ReadonlyArray<number>} pos - Position counts.
 * @param {number} totalMoves - Total moves.
 * @returns {string} HTML markup.
 */
function buildMoveGrid(pos, totalMoves) {
  let grid = '';
  for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
    const pct = Math.round((100 * (pos[cellIndex] || 0)) / totalMoves);
    grid += `
      <div class="hcell" style="background:color-mix(in srgb,var(--x) ${Math.min(80, pct * 2)}%,var(--bg))" title="${formatCoordinates(cellIndex)}: ${pct}% of moves">
        ${pct}%
      </div>
    `;
  }
  return grid;
}

/**
 * Builds the 3x3 mistake heatmap grid HTML.
 * @param {ReadonlyArray<number>} mistakeArray - Mistake count per cell.
 * @param {number} totalMistakes - Total mistakes count.
 * @returns {string} HTML markup.
 */
function buildMistakeGrid(mistakeArray, totalMistakes) {
  let grid = '';
  for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
    const errorCount = mistakeArray[cellIndex] || 0;
    const pct = totalMistakes > 0 ? Math.round((100 * errorCount) / totalMistakes) : 0;
    const bg = totalMistakes > 0 && pct > 0
      ? `color-mix(in srgb,var(--bad) ${Math.min(80, Math.max(15, pct * 2))}%,var(--bg))`
      : 'var(--bg)';
    const tip = totalMistakes > 0 ? `${formatCoordinates(cellIndex)}: ${pct}% of mistakes (${errorCount})` : '0 mistakes';
    grid += `<div class="hcell" style="background:${bg}" title="${tip}">${totalMistakes > 0 ? `${pct}%` : '0%'}</div>`;
  }
  return grid;
}

/**
 * Calculates regional percentages and favorite region text.
 * @param {ReadonlyArray<number>} pos - Position counts.
 * @param {number} totalMoves - Total moves count.
 * @returns {string} Formatted paragraph text.
 */
function getRegionalSummaryText(pos, totalMoves) {
  const getPct = (cells) => Math.round((100 * cells.reduce((sum, idx) => sum + (pos[idx] || 0), 0)) / totalMoves);
  const corners = getPct(BOARD_CELLS.CORNERS);
  const edges = getPct(BOARD_CELLS.EDGES);
  const center = getPct([BOARD_CELLS.CENTER]);
  const maxPct = Math.max(corners, edges, center);
  const favorite = maxPct === corners ? 'corners' : (maxPct === edges ? 'edges' : 'the center');
  return `You favor ${favorite}: ${corners}% corners, ${edges}% edges, ${center}% center`;
}

/**
 * Builds lifetime accuracy progress bars.
 * @param {Record<string, [number, number]>} acc - Accuracy model.
 * @returns {string} HTML markup.
 */
function buildLifetimeBars(acc) {
  let bars = '';
  for (const algorithmKey of ALGORITHM_KEYS) {
    const [hits, totalAttempts] = acc[algorithmKey];
    bars += createProgressBar(ALGORITHM_NAMES[algorithmKey], hits, totalAttempts);
  }
  return bars;
}

/**
 * Renders the habits and mistake heatmap panel.
 * @param {HTMLElement} container - DOM element to render into.
 * @param {object} model - The habits statistical model.
 * @param {() => void} onReset - Callback when user clicks Reset button.
 */
export function renderHabits(container, model, onReset) {
  if (!container) return;
  const totalMoves = model.moves;
  if (!totalMoves) {
    container.innerHTML = '<h2>Your habits</h2><p class="muted">Finish a match and your move patterns show up here. Four algorithms compete to predict you: perfect play, your habit profile, your move sequence, and a combined model that weighs them by past accuracy.</p>';
    return;
  }

  const mistakeArray = model.mistakePos || Array(9).fill(0);
  const totalMistakes = mistakeArray.reduce((sum, count) => sum + count, 0);
  const summaryText = getRegionalSummaryText(model.pos, totalMoves);
  const moveGridHtml = buildMoveGrid(model.pos, totalMoves);
  const mistakeGridHtml = buildMistakeGrid(mistakeArray, totalMistakes);
  const lifetimeBarsHtml = buildLifetimeBars(model.acc);

  container.innerHTML = `
    <h2>Your habits</h2>
    <p>${summaryText}, over ${model.games} ${model.games === 1 ? 'match' : 'matches'} (${totalMoves} moves).</p>
    <div class="heatmaps-row">
      <div class="heatmap-col"><h3>Move frequency</h3><div class="hgrid" aria-label="Share of your moves by cell">${moveGridHtml}</div></div>
      <div class="heatmap-col"><h3>Mistake heatmap</h3><div class="hgrid" aria-label="Share of your mistakes by cell">${mistakeGridHtml}</div></div>
    </div>
    ${totalMistakes > 0 ? `<p class="muted">You made ${totalMistakes} ${totalMistakes === 1 ? 'mistake' : 'mistakes'} in total. The mistake heatmap highlights which cells your errors most often land on.</p>` : '<p class="muted">No mistakes recorded yet! Perfect play so far.</p>'}
    <p class="muted">Lifetime prediction accuracy:</p>
    <div class="bars">${lifetimeBarsHtml}</div>
    <button class="btn" id="resetBtn" type="button">Reset habits and scores</button>
  `;
  container.querySelector('#resetBtn')?.addEventListener('click', onReset);
}
