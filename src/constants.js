/**
 * @fileoverview Application constants, configuration, and shared tokens.
 */

/**
 * All 8 possible 3-in-a-row winning lines on a 3x3 board.
 * @type {ReadonlyArray<ReadonlyArray<number>>}
 */
export const WINNING_LINES = Object.freeze([
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
]);

/**
 * Identifiers for the 4 prediction algorithms.
 * @type {ReadonlyArray<string>}
 */
export const ALGORITHM_KEYS = Object.freeze(['ens', 'perfect', 'habit', 'markov']);

/**
 * Human-readable display names for prediction algorithms.
 * @type {Readonly<Record<string, string>>}
 */
export const ALGORITHM_NAMES = Object.freeze({
  ens: 'Combined',
  perfect: 'Perfect play',
  habit: 'Habit profile',
  markov: 'Move sequence'
});

/**
 * localStorage key for habits and match records.
 * @type {string}
 */
export const STORAGE_KEY = 'ttt-habits-v2';

/**
 * Available computer difficulty levels.
 * @type {Readonly<Record<string, string>>}
 */
export const DIFFICULTY_LEVELS = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  ADAPTIVE: 'adaptive'
});

/**
 * Player mark tokens.
 * @type {Readonly<Record<string, string>>}
 */
export const PLAYERS = Object.freeze({
  USER: 'X',
  COMPUTER: 'O'
});

/**
 * Board cell classifications by geometry.
 * @type {Readonly<{ CENTER: number, CORNERS: ReadonlyArray<number>, EDGES: ReadonlyArray<number> }>}
 */
export const BOARD_CELLS = Object.freeze({
  CENTER: 4,
  CORNERS: Object.freeze([0, 2, 6, 8]),
  EDGES: Object.freeze([1, 3, 5, 7])
});

/**
 * Maximum number of completed matches persisted in localStorage.
 * @type {number}
 */
export const MAX_MATCH_HISTORY = 100;

/**
 * Number of recent matches rendered on the progress chart.
 * @type {number}
 */
export const CHART_WINDOW_SIZE = 20;
