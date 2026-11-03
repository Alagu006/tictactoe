/**
 * @fileoverview Computer move selection strategies for all difficulty levels:
 * Easy, Medium, Hard (unbeatable minimax), and Adaptive (unbeatable & habit-aware).
 */

import { PLAYERS, BOARD_CELLS, WINNING_LINES, DIFFICULTY_LEVELS } from './constants.js';
import { getLegalMoves, minimax } from './game.js';
import { predictHabit } from './predictors.js';

/**
 * Picks a random element from an array.
 * @template T
 * @param {ReadonlyArray<T>} items - List of items.
 * @returns {T} A randomly chosen element.
 */
function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Finds all legal moves that achieve the optimal minimax score for the computer.
 * @param {ReadonlyArray<string|null>} board - The 9-cell board state.
 * @returns {number[]} Array of legal move indices that guarantee optimal outcome.
 */
export function getSafeOptimalMoves(board) {
  const legalMoves = getLegalMoves(board);
  if (!legalMoves.length) return [];

  const boardCopy = board.slice();
  let optimalScore = 99;
  const moveScores = {};

  for (const moveIndex of legalMoves) {
    boardCopy[moveIndex] = PLAYERS.COMPUTER;
    const score = minimax(boardCopy, PLAYERS.USER, 1);
    boardCopy[moveIndex] = null;
    moveScores[moveIndex] = score;
    if (score < optimalScore) optimalScore = score;
  }

  return legalMoves.filter(moveIndex => moveScores[moveIndex] === optimalScore);
}

/**
 * Selects a move for Easy difficulty (pure random legal move).
 * @param {ReadonlyArray<string|null>} board - The 9-cell board state.
 * @returns {number|null} Selected cell index.
 */
export function selectEasyMove(board) {
  const legalMoves = getLegalMoves(board);
  return legalMoves.length ? pickRandom(legalMoves) : null;
}

/**
 * Selects a move for Medium difficulty (40% random, 60% optimal minimax).
 * @param {ReadonlyArray<string|null>} board - The 9-cell board state.
 * @returns {number|null} Selected cell index.
 */
export function selectMediumMove(board) {
  return Math.random() < 0.4 ? selectEasyMove(board) : selectHardMove(board);
}

/**
 * Selects a move for Hard difficulty (pure minimax, mathematically unbeatable).
 * @param {ReadonlyArray<string|null>} board - The 9-cell board state.
 * @returns {number|null} Selected cell index.
 */
export function selectHardMove(board) {
  const optimalMoves = getSafeOptimalMoves(board);
  return optimalMoves.length ? pickRandom(optimalMoves) : null;
}

/**
 * Finds a safe optimal move that blocks the user's predicted cell along a line.
 * @param {ReadonlyArray<number>} safeMoves - Optimal safe moves.
 * @param {number} predictedCell - Cell user is predicted to want.
 * @param {ReadonlyArray<string|null>} board - Board state.
 * @returns {number|null} Blocking move or null.
 */
function findHabitCounterMove(safeMoves, predictedCell, board) {
  if (safeMoves.includes(predictedCell)) return predictedCell;
  const blockingMoves = safeMoves.filter(moveIndex => {
    return WINNING_LINES.some(line => {
      return line.includes(moveIndex) &&
             line.includes(predictedCell) &&
             line.some(cellIdx => board[cellIdx] === PLAYERS.USER);
    });
  });
  return blockingMoves.length ? blockingMoves[0] : null;
}

/**
 * Selects a move for Adaptive difficulty:
 * Unbeatable yet personal. Finds every move that guarantees the optimal
 * outcome for Computer (O), and among those safe moves, prefers taking or
 * blocking the cell that the habit profile predicts the user will play next,
 * falling back to the center then corners among safe moves.
 *
 * @param {ReadonlyArray<string|null>} board - The 9-cell board state.
 * @param {object} model - The habits statistical model.
 * @returns {number|null} Selected cell index.
 */
export function selectAdaptiveMove(board, model) {
  const safeMoves = getSafeOptimalMoves(board);
  if (!safeMoves.length) return null;

  const habitResult = predictHabit(board, model);
  if (habitResult.move !== null && habitResult.move !== undefined) {
    const counterMove = findHabitCounterMove(safeMoves, habitResult.move, board);
    if (counterMove !== null) return counterMove;
  }

  if (safeMoves.includes(BOARD_CELLS.CENTER)) return BOARD_CELLS.CENTER;
  const safeCorners = BOARD_CELLS.CORNERS.filter(c => safeMoves.includes(c));
  if (safeCorners.length) return safeCorners[0];

  return safeMoves[0];
}

/**
 * Dispatches move selection based on difficulty level setting.
 * @param {ReadonlyArray<string|null>} board - The 9-cell board state.
 * @param {string} level - Difficulty level ('easy', 'medium', 'hard', 'adaptive').
 * @param {object} model - The habits statistical model.
 * @returns {number|null} Selected move index.
 */
export function selectComputerMove(board, level, model) {
  switch (level) {
    case DIFFICULTY_LEVELS.EASY:
      return selectEasyMove(board);
    case DIFFICULTY_LEVELS.MEDIUM:
      return selectMediumMove(board);
    case DIFFICULTY_LEVELS.ADAPTIVE:
      return selectAdaptiveMove(board, model);
    case DIFFICULTY_LEVELS.HARD:
    default:
      return selectHardMove(board);
  }
}
