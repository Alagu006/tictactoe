/**
 * @fileoverview Review UI component: renders the post-match evaluation,
 * detected play patterns, algorithm accuracy bars, and move list with confidence scores.
 */

import { ALGORITHM_KEYS, ALGORITHM_NAMES, PLAYERS } from '../constants.js';
import { formatCoordinates } from '../game.js';
import { classifyMoveQuality, countMistakes } from '../review.js';
import { renderReplayControls } from './replay.js';

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
 * Builds the top summary headline and mistake sentence.
 * @param {string|null} winner - 'X', 'O', or null.
 * @param {ReadonlyArray<object>} userHistory - Turns.
 * @returns {string} HTML markup.
 */
function buildSummaryHeader(winner, userHistory) {
  const count = countMistakes(userHistory);
  const outcomeText = winner
    ? (winner === PLAYERS.USER ? 'You won.' : 'The computer won.')
    : 'The match was a draw.';
  return `
    <h2>Match review</h2>
    <p>${outcomeText} You made ${count} ${count === 1 ? 'mistake' : 'mistakes'} in ${userHistory.length} moves.</p>
  `;
}

/**
 * Builds the detected patterns badge row.
 * @param {Array<{ id: string, name: string }>} detectedPatterns - Detected patterns.
 * @param {number} totalGames - Total games count.
 * @param {Record<string, number>} patternCounts - Pattern frequency map.
 * @returns {string} HTML markup.
 */
function buildPatternPills(detectedPatterns, totalGames, patternCounts) {
  const topPatterns = detectedPatterns.slice(0, 2);
  if (!topPatterns.length) return '';

  let pills = '<div class="patterns-box" role="region" aria-label="Detected patterns of play">';
  for (const pattern of topPatterns) {
    const occurrences = (patternCounts && patternCounts[pattern.id]) || 1;
    const share = totalGames > 0 ? Math.round((100 * occurrences) / totalGames) : 100;
    pills += `<span class="pattern-pill">Pattern: <b>${pattern.name}</b> (in ${share}% of matches)</span>`;
  }
  return pills + '</div>';
}

/**
 * Builds the 4 algorithm accuracy progress bars for this match.
 * @param {ReadonlyArray<object>} userHistory - User turns.
 * @returns {string} HTML markup.
 */
function buildAccuracyBars(userHistory) {
  let bars = '<p class="muted" style="margin-top:14px">Prediction accuracy this match:</p><div class="bars">';
  for (const algorithmKey of ALGORITHM_KEYS) {
    const evaluatedMoves = userHistory.filter(h => h.preds[algorithmKey] !== null);
    const correctHits = evaluatedMoves.filter(h => h.preds[algorithmKey] === h.i).length;
    bars += evaluatedMoves.length
      ? createProgressBar(ALGORITHM_NAMES[algorithmKey], correctHits, evaluatedMoves.length)
      : `<div class="bar"><span>${ALGORITHM_NAMES[algorithmKey]}</span><i></i><span>–</span></div>`;
  }
  return bars + '</div>';
}

/**
 * Builds the 4 prediction chips with confidence percentages for a move.
 * @param {object} turn - Turn record.
 * @returns {string} HTML markup.
 */
function buildPredictionChips(turn) {
  const chips = [
    { label: 'Combined', pick: turn.preds.ens, conf: turn.conf.ens, isHit: turn.preds.ens === turn.i },
    { label: 'Perfect', pick: turn.preds.perfect, conf: turn.conf.perfect, isHit: turn.preds.perfect === turn.i },
    { label: 'Habit', pick: turn.preds.habit, conf: turn.conf.habit, isHit: turn.preds.habit === turn.i },
    { label: 'Markov', pick: turn.preds.markov, conf: turn.conf.markov, isHit: turn.preds.markov === turn.i }
  ];

  return chips.map(c => `
    <div class="pred-chip ${c.isHit ? 'hit' : ''}">
      <span>${c.label}: ${c.pick !== null ? formatCoordinates(c.pick) : '–'}</span>
      <span class="conf-pill">${c.conf != null ? `${c.conf}%` : '–'}</span>
    </div>
  `).join('');
}

/**
 * Builds a single review move list item.
 * @param {object} turn - User turn record.
 * @param {number} moveIndex - Index of move.
 * @param {ReadonlyArray<object>} matchMoves - Chronological moves.
 * @param {number} currentReplayStep - Active replay step.
 * @returns {string} HTML markup.
 */
function buildMoveListItem(turn, moveIndex, matchMoves, currentReplayStep) {
  const quality = classifyMoveQuality(turn.sc[turn.i], turn.sc[turn.preds.perfect], turn.preds.perfect);
  const targetStep = matchMoves.findIndex(m => m.player === PLAYERS.USER && m.cell === turn.i && m.bestMove === turn.preds.perfect) + 1;
  const isActive = currentReplayStep === targetStep;
  const expectedText = turn.preds.ens === turn.i ? 'predicted it.' : `expected ${formatCoordinates(turn.preds.ens)}.`;

  return `
    <li class="${quality.category} ${isActive ? 'active' : ''}" data-step="${targetStep}" tabindex="0" role="button" aria-label="Move ${moveIndex + 1}, ${formatCoordinates(turn.i)} — ${quality.title}">
      <b>Move ${moveIndex + 1}: ${formatCoordinates(turn.i)} — ${quality.title}</b>
      ${quality.detail} The combined model ${expectedText}
      <div class="pred-grid">${buildPredictionChips(turn)}</div>
    </li>
  `;
}

/**
 * Builds the complete move breakdown list.
 * @param {ReadonlyArray<object>} userHistory - History of user turns.
 * @param {ReadonlyArray<object>} matchMoves - Chronological moves.
 * @param {number} currentReplayStep - Active replay step.
 * @returns {string} HTML markup.
 */
function buildMoveList(userHistory, matchMoves, currentReplayStep) {
  const listItems = userHistory.map((turn, idx) => buildMoveListItem(turn, idx, matchMoves, currentReplayStep)).join('');
  return `<p class="muted" style="margin-top:14px">Your moves with algorithm confidence scores (click any move to replay):</p><ul class="moves">${listItems}</ul>`;
}

/**
 * Attaches click and keyboard listeners to review move list items.
 * @param {HTMLElement} container - Review container.
 * @param {(step: number) => void} onStepChange - Replay step callback.
 */
function bindMoveListEvents(container, onStepChange) {
  container.querySelectorAll('ul.moves li').forEach(item => {
    const step = parseInt(item.getAttribute('data-step'), 10);
    item.addEventListener('click', () => onStepChange(step));
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onStepChange(step);
      }
    });
  });
}

/**
 * Renders the match review card.
 * @param {HTMLElement} container - DOM element for review card.
 * @param {object} options - State options.
 */
export function renderReview(container, options) {
  if (!container) return;
  const { isGameOver, winner, userHistory, matchMoves, detectedPatterns, totalGames, patternCounts, currentReplayStep, onStepChange } = options;

  if (!isGameOver) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }

  const headerHtml = buildSummaryHeader(winner, userHistory);
  const patternsHtml = buildPatternPills(detectedPatterns, totalGames, patternCounts);
  const replayBoxHtml = '<div class="replay-box" id="replayControlsBox"></div>';
  const accuracyBarsHtml = buildAccuracyBars(userHistory);
  const movesListHtml = buildMoveList(userHistory, matchMoves, currentReplayStep);

  container.innerHTML = headerHtml + patternsHtml + replayBoxHtml + accuracyBarsHtml + movesListHtml;
  container.hidden = false;

  const replayBox = container.querySelector('#replayControlsBox');
  if (replayBox) {
    renderReplayControls(replayBox, { currentStep: currentReplayStep, totalSteps: matchMoves.length, matchMoves, onStepChange });
  }
  bindMoveListEvents(container, onStepChange);
}
