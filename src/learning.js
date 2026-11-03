/**
 * @fileoverview Pure functions for updating the habits model after match conclusion.
 * Zero DOM dependencies so it can be thoroughly tested in Node.
 */

import { ALGORITHM_KEYS, PLAYERS, MAX_MATCH_HISTORY } from './constants.js';
import { checkWinner, scoreCategory } from './game.js';
import { detectPlayPatterns } from './patterns.js';

/**
 * Updates move frequency, positional counts, mistakes, and algorithm accuracies.
 * @param {object} model - The habits model to update.
 * @param {ReadonlyArray<object>} userHistory - History of user turns in the match.
 */
export function updateHabitCounts(model, userHistory) {
  for (const turn of userHistory) {
    model.moves++;
    model.pos[turn.i]++;

    const isMistake = scoreCategory(turn.sc[turn.i]) !== scoreCategory(turn.sc[turn.preds.perfect]);
    if (isMistake) {
      if (!Array.isArray(model.mistakePos)) model.mistakePos = Array(9).fill(0);
      model.mistakePos[turn.i] = (model.mistakePos[turn.i] || 0) + 1;
    }

    const stateKey = turn.key;
    const stateCounts = model.state[stateKey] = model.state[stateKey] || {};
    stateCounts[turn.i] = (stateCounts[turn.i] || 0) + 1;

    const transCounts = model.trans[turn.ctx] = model.trans[turn.ctx] || {};
    transCounts[turn.i] = (transCounts[turn.i] || 0) + 1;

    for (const algorithmKey of ALGORITHM_KEYS) {
      if (turn.preds[algorithmKey] !== null) {
        model.acc[algorithmKey][1]++;
        if (turn.preds[algorithmKey] === turn.i) {
          model.acc[algorithmKey][0]++;
        }
      }
    }
  }
}

/**
 * Updates the win, draw, or loss record in the model.
 * @param {object} model - The habits model.
 * @param {ReadonlyArray<string|null>} board - Final board state.
 * @returns {'w' | 'l' | 'd'} Result letter code.
 */
export function updateGameRecord(model, board) {
  const outcome = checkWinner(board);
  if (!outcome) {
    model.rec.d++;
    return 'd';
  }
  if (outcome.player === PLAYERS.USER) {
    model.rec.w++;
    return 'w';
  }
  model.rec.l++;
  return 'l';
}

/**
 * Records match statistics into matchHistory, capping at MAX_MATCH_HISTORY.
 * @param {object} model - The habits model.
 * @param {ReadonlyArray<object>} userHistory - User turns in the match.
 * @param {'w' | 'l' | 'd'} resultLetter - Match outcome code.
 */
export function recordMatchHistory(model, userHistory, resultLetter) {
  const evaluatedTurns = userHistory.filter(h => h.preds.ens !== null);
  const correctHits = evaluatedTurns.filter(h => h.preds.ens === h.i).length;
  const matchAccuracy = evaluatedTurns.length ? Math.round((100 * correctHits) / evaluatedTurns.length) : 0;
  const matchMistakes = userHistory.filter(h => scoreCategory(h.sc[h.i]) !== scoreCategory(h.sc[h.preds.perfect])).length;

  model.games++;
  if (!Array.isArray(model.matchHistory)) model.matchHistory = [];
  model.matchHistory.push({
    match: model.games,
    accuracy: matchAccuracy,
    mistakes: matchMistakes,
    result: resultLetter,
    moves: userHistory.length
  });

  if (model.matchHistory.length > MAX_MATCH_HISTORY) {
    model.matchHistory = model.matchHistory.slice(-MAX_MATCH_HISTORY);
  }
}

/**
 * Detects patterns in the match and increments lifetime pattern counts.
 * @param {object} model - The habits model.
 * @param {ReadonlyArray<object>} userHistory - User turns.
 * @param {ReadonlyArray<object>} matchMoves - Chronological moves from both players.
 */
export function updatePatternCounts(model, userHistory, matchMoves) {
  if (!model.patterns || typeof model.patterns !== 'object') model.patterns = {};
  const detected = detectPlayPatterns(userHistory, matchMoves);
  for (const pattern of detected) {
    model.patterns[pattern.id] = (model.patterns[pattern.id] || 0) + 1;
  }
}

/**
 * Master function: learns from a finished match by updating all model stats.
 *
 * @param {object} model - The habits model.
 * @param {object} matchData - Match summary data.
 * @param {ReadonlyArray<string|null>} matchData.board - Final board state.
 * @param {ReadonlyArray<object>} matchData.userHistory - User turns.
 * @param {ReadonlyArray<object>} matchData.matchMoves - All moves.
 * @returns {object} Updated model.
 */
export function learnFromFinishedMatch(model, matchData) {
  const { board, userHistory, matchMoves } = matchData;
  updateHabitCounts(model, userHistory);
  const resultLetter = updateGameRecord(model, board);
  recordMatchHistory(model, userHistory, resultLetter);
  updatePatternCounts(model, userHistory, matchMoves);
  return model;
}
