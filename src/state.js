/**
 * @fileoverview Manages the active game-flow state (board, turns, move history, replay).
 */

import { PLAYERS } from './constants.js';
import { checkWinner, isBoardFull } from './game.js';

/**
 * Creates a clean, initial game state object.
 * @returns {object} New state object.
 */
export function createInitialState() {
  return {
    board: Array(9).fill(null),
    isGameOver: false,
    isUserTurn: true,
    winningLine: [],
    userHistory: [],
    matchMoves: [],
    currentReplayStep: 0,
    lastUserMove: 9,
    currentPredictions: null,
    currentConfidences: null,
    currentScores: {},
    freshMoves: [],
    hasLearned: false
  };
}

/**
 * Resets the state for starting a new match.
 * @param {object} state - Active state object to mutate.
 */
export function resetGameState(state) {
  state.board = Array(9).fill(null);
  state.isGameOver = false;
  state.isUserTurn = true;
  state.winningLine = [];
  state.userHistory = [];
  state.matchMoves = [];
  state.currentReplayStep = 0;
  state.lastUserMove = 9;
  state.currentPredictions = null;
  state.currentConfidences = null;
  state.currentScores = {};
  state.freshMoves = [];
  state.hasLearned = false;
}

/**
 * Records a user move into the state.
 * @param {object} state - Active state.
 * @param {number} cellIndex - Selected cell index.
 */
export function recordUserMove(state, cellIndex) {
  state.userHistory.push({
    i: cellIndex,
    preds: Object.assign({}, state.currentPredictions),
    conf: Object.assign({}, state.currentConfidences),
    ctx: state.lastUserMove,
    key: state.board.map(c => c || '-').join(''),
    sc: Object.assign({}, state.currentScores)
  });

  state.board[cellIndex] = PLAYERS.USER;
  state.lastUserMove = cellIndex;
  state.freshMoves = [cellIndex];

  state.matchMoves.push({
    player: PLAYERS.USER,
    cell: cellIndex,
    board: state.board.slice(),
    preds: Object.assign({}, state.currentPredictions),
    conf: Object.assign({}, state.currentConfidences),
    bestMove: state.currentPredictions.perfect,
    predicted: state.currentPredictions.ens,
    scores: Object.assign({}, state.currentScores)
  });
}

/**
 * Records a computer move into the state.
 * @param {object} state - Active state.
 * @param {number} cellIndex - Chosen cell index.
 */
export function recordComputerMove(state, cellIndex) {
  state.board[cellIndex] = PLAYERS.COMPUTER;
  state.freshMoves = [cellIndex];

  state.matchMoves.push({
    player: PLAYERS.COMPUTER,
    cell: cellIndex,
    board: state.board.slice(),
    preds: null,
    conf: null,
    bestMove: null,
    predicted: null,
    scores: {}
  });
}

/**
 * Checks and updates whether the match has ended (win or draw).
 * @param {object} state - Active state.
 * @returns {boolean} True if game is over.
 */
export function checkGameTermination(state) {
  const outcome = checkWinner(state.board);
  if (outcome) {
    state.isGameOver = true;
    state.winningLine = outcome.line;
    return true;
  }
  if (isBoardFull(state.board)) {
    state.isGameOver = true;
    return true;
  }
  return false;
}
