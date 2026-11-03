/**
 * @fileoverview Pure game logic for Tic-tac-toe: winner detection,
 * minimax search, legal moves, and board coordinate helpers.
 */

import { WINNING_LINES, PLAYERS } from './constants.js';

/**
 * Checks if either player has won the game on the given board.
 * @param {ReadonlyArray<string|null>} currentBoard - The 9-cell board state.
 * @returns {{ player: string, line: ReadonlyArray<number> } | null} The winner and winning line, or null.
 */
export function checkWinner(currentBoard) {
  for (const line of WINNING_LINES) {
    const [cellA, cellB, cellC] = line;
    const playerAtA = currentBoard[cellA];
    if (playerAtA && playerAtA === currentBoard[cellB] && playerAtA === currentBoard[cellC]) {
      return { player: playerAtA, line };
    }
  }
  return null;
}

/**
 * Checks if every cell on the board is occupied.
 * @param {ReadonlyArray<string|null>} currentBoard - The 9-cell board state.
 * @returns {boolean} True if all cells are filled, false otherwise.
 */
export function isBoardFull(currentBoard) {
  return currentBoard.every(Boolean);
}

/**
 * Returns an array of empty cell indices available for play.
 * @param {ReadonlyArray<string|null>} currentBoard - The 9-cell board state.
 * @returns {number[]} Array of legal cell indices (0 to 8).
 */
export function getLegalMoves(currentBoard) {
  const legalMoves = [];
  for (let index = 0; index < 9; index++) {
    if (!currentBoard[index]) {
      legalMoves.push(index);
    }
  }
  return legalMoves;
}

/**
 * Minimax recursive game-tree search for optimal play evaluation.
 * Returns a positive score for user wins (10 - depth), negative for computer
 * wins (depth - 10), and 0 for draws.
 *
 * @param {Array<string|null>} currentBoard - The 9-cell board state (mutated and restored in-place).
 * @param {string} activePlayer - The player whose turn it is ('X' or 'O').
 * @param {number} depth - Search depth in turns from the root state.
 * @returns {number} The optimal minimax score for the active player.
 */
export function minimax(currentBoard, activePlayer, depth) {
  const gameWinner = checkWinner(currentBoard);
  if (gameWinner) {
    return gameWinner.player === PLAYERS.USER ? 10 - depth : depth - 10;
  }
  if (isBoardFull(currentBoard)) {
    return 0;
  }

  let optimalScore = activePlayer === PLAYERS.USER ? -99 : 99;
  const legalMoves = getLegalMoves(currentBoard);

  for (const moveIndex of legalMoves) {
    currentBoard[moveIndex] = activePlayer;
    const nextPlayer = activePlayer === PLAYERS.USER ? PLAYERS.COMPUTER : PLAYERS.USER;
    const branchScore = minimax(currentBoard, nextPlayer, depth + 1);
    currentBoard[moveIndex] = null;

    if (activePlayer === PLAYERS.USER) {
      optimalScore = Math.max(optimalScore, branchScore);
    } else {
      optimalScore = Math.min(optimalScore, branchScore);
    }
  }

  return optimalScore;
}

/**
 * Evaluates minimax scores for every legal user move from the current board.
 * @param {ReadonlyArray<string|null>} currentBoard - The 9-cell board state.
 * @returns {Record<number, number>} Map of move index to minimax evaluation score.
 */
export function evaluateMovesForUser(currentBoard) {
  const moveScores = {};
  const boardCopy = currentBoard.slice();
  const legalMoves = getLegalMoves(boardCopy);

  for (const moveIndex of legalMoves) {
    boardCopy[moveIndex] = PLAYERS.USER;
    moveScores[moveIndex] = minimax(boardCopy, PLAYERS.COMPUTER, 1);
    boardCopy[moveIndex] = null;
  }

  return moveScores;
}

/**
 * Checks if a player has an immediate winning move on the board.
 * @param {ReadonlyArray<string|null>} currentBoard - The 9-cell board state.
 * @param {string} player - The player to check for ('X' or 'O').
 * @returns {number|null} The index of the winning cell, or null if none exists.
 */
export function getImmediateWinningMove(currentBoard, player) {
  const boardCopy = currentBoard.slice();
  const legalMoves = getLegalMoves(boardCopy);

  for (const moveIndex of legalMoves) {
    boardCopy[moveIndex] = player;
    const outcome = checkWinner(boardCopy);
    boardCopy[moveIndex] = null;
    if (outcome && outcome.player === player) {
      return moveIndex;
    }
  }

  return null;
}

/**
 * Generates a string serialization key of the board for state caches.
 * @param {ReadonlyArray<string|null>} currentBoard - The 9-cell board state.
 * @returns {string} Serialized string such as 'X---O----'.
 */
export function serializeBoard(currentBoard) {
  return currentBoard.map(cell => cell || '-').join('');
}

/**
 * Formats a cell index into a human-readable coordinate description.
 * @param {number} cellIndex - The 0-indexed cell position (0 to 8).
 * @returns {string} E.g., 'row 1, column 2'.
 */
export function formatCoordinates(cellIndex) {
  const rowIndex = Math.floor(cellIndex / 3) + 1;
  const columnIndex = (cellIndex % 3) + 1;
  return `row ${rowIndex}, column ${columnIndex}`;
}

/**
 * Categorizes a minimax score into win, loss, or draw.
 * @param {number} score - The numerical minimax score.
 * @returns {'win' | 'loss' | 'draw'} Category string.
 */
export function scoreCategory(score) {
  if (score > 0) return 'win';
  if (score < 0) return 'loss';
  return 'draw';
}
