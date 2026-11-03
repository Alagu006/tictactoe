/**
 * @fileoverview Post-match analysis, move quality classification,
 * replay step descriptions, and mistake tracking.
 */

import { formatCoordinates, scoreCategory } from './game.js';
import { PLAYERS } from './constants.js';

/**
 * Classifies a move by comparing the player's minimax score against the best available score.
 *
 * @param {number} playedScore - Minimax score of the chosen move.
 * @param {number} bestScore - Minimax score of the optimal move.
 * @param {number} bestMoveIndex - Index of the optimal move cell.
 * @returns {{ category: 'best' | 'ok' | 'miss', title: string, detail: string }}
 */
export function classifyMoveQuality(playedScore, bestScore, bestMoveIndex) {
  if (playedScore === bestScore) {
    return {
      category: 'best',
      title: 'Best move',
      detail: 'This was the strongest option.'
    };
  }

  const playedOutcome = scoreCategory(playedScore);
  const bestOutcome = scoreCategory(bestScore);

  if (playedOutcome === bestOutcome) {
    return {
      category: 'ok',
      title: 'Good move',
      detail: `Same result as the best move, but ${formatCoordinates(bestMoveIndex)} was faster or safer.`
    };
  }

  return {
    category: 'miss',
    title: 'Mistake',
    detail: `This led to a ${playedOutcome} with perfect play. ${formatCoordinates(bestMoveIndex)} would have kept a ${bestOutcome}.`
  };
}

/**
 * Counts how many mistakes the user made in a match.
 * A mistake is any move that degraded the game-theoretic outcome (e.g. from draw to loss).
 *
 * @param {ReadonlyArray<object>} userHistory - History of user turns.
 * @returns {number} Mistake count.
 */
export function countMistakes(userHistory) {
  return userHistory.filter(turnItem => {
    const chosenScore = turnItem.sc[turnItem.i];
    const bestScore = turnItem.sc[turnItem.preds.perfect];
    return scoreCategory(chosenScore) !== scoreCategory(bestScore);
  }).length;
}

/**
 * Generates an informative plain-English description for the currently viewed replay step.
 *
 * @param {number} stepIndex - Current replay step (0 = start, 1..N = moves).
 * @param {ReadonlyArray<object>} fullMatchMoves - List of match moves.
 * @returns {string} Formatted HTML/text description.
 */
export function getReplayStepSummary(stepIndex, fullMatchMoves) {
  const totalSteps = fullMatchMoves.length;
  if (stepIndex === 0) {
    return `Step 0 of ${totalSteps}: Match start (empty board).`;
  }

  const moveData = fullMatchMoves[stepIndex - 1];
  if (moveData.player === PLAYERS.USER) {
    const bestConfidence = moveData.conf && moveData.conf.perfect != null ? ` (${moveData.conf.perfect}%)` : '';
    const predConfidence = moveData.conf && moveData.conf.ens != null ? ` (${moveData.conf.ens}%)` : '';
    return `<b>Step ${stepIndex} of ${totalSteps} (You):</b> Played ${formatCoordinates(moveData.cell)}.` +
           ` Best move: ${formatCoordinates(moveData.bestMove)}${bestConfidence}.` +
           ` Combined prediction: ${formatCoordinates(moveData.predicted)}${predConfidence}.`;
  }

  return `<b>Step ${stepIndex} of ${totalSteps} (Computer):</b> Played ${formatCoordinates(moveData.cell)}.`;
}
