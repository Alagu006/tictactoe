/**
 * @fileoverview Scoreboard UI component: renders wins, draws, and losses.
 */

/**
 * Renders the lifetime wins, draws, and losses scorecard into the target DOM element.
 * @param {HTMLElement} container - The container element to render into.
 * @param {{ w: number, d: number, l: number }} record - Game record counts.
 */
export function renderScoreboard(container, record) {
  if (!container) return;
  container.innerHTML = `
    <div class="you"><b>${record.w}</b><span>You</span></div>
    <div><b>${record.d}</b><span>Draws</span></div>
    <div class="cpu"><b>${record.l}</b><span>Computer</span></div>
  `;
}
