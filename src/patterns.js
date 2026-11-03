/**
 * @fileoverview Pattern-of-play detection: recognizes human player strategies
 * such as Center First, Edge Opener, Corner then Opposite Corner, and Always Blocks.
 */

import { BOARD_CELLS, PLAYERS } from './constants.js';
import { checkWinner, getImmediateWinningMove } from './game.js';

/**
 * Checks if two corners are diagonally opposite.
 * @param {number} cornerA - First corner cell index (0, 2, 6, 8).
 * @param {number} cornerB - Second corner cell index (0, 2, 6, 8).
 * @returns {boolean} True if diagonally opposite.
 */
function areOppositeCorners(cornerA, cornerB) {
  return (cornerA === 0 && cornerB === 8) ||
         (cornerA === 8 && cornerB === 0) ||
         (cornerA === 2 && cornerB === 6) ||
         (cornerA === 6 && cornerB === 2);
}

/**
 * Counts how many immediate winning lines a player can complete on the board.
 * @param {ReadonlyArray<string|null>} board - Board state.
 * @param {string} player - Player mark ('X' or 'O').
 * @returns {number} Number of winning threats.
 */
function countWinningThreats(board, player) {
  const boardCopy = board.slice();
  let threats = 0;
  for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
    if (!boardCopy[cellIndex]) {
      boardCopy[cellIndex] = player;
      if (checkWinner(boardCopy)) threats++;
      boardCopy[cellIndex] = null;
    }
  }
  return threats;
}

/**
 * Checks if user's move sequence follows "Always blocks, never attacks".
 * Verifies that the user successfully blocked every immediate computer threat,
 * and never created an offensive fork (2+ simultaneous winning lines).
 *
 * @param {ReadonlyArray<object>} fullMatchMoves - List of all chronological match moves.
 * @returns {boolean} True if behavior matches purely defensive play.
 */
function checkAlwaysBlocksPattern(fullMatchMoves) {
  let blocksMade = 0;
  let missedBlocks = 0;
  let offensiveForksCreated = 0;

  for (let stepIndex = 0; stepIndex < fullMatchMoves.length; stepIndex++) {
    const moveData = fullMatchMoves[stepIndex];
    if (moveData.player === PLAYERS.USER) {
      const prevBoard = stepIndex === 0 ? Array(9).fill(null) : fullMatchMoves[stepIndex - 1].board;
      const cpuThreat = getImmediateWinningMove(prevBoard, PLAYERS.COMPUTER);

      if (cpuThreat !== null) {
        if (moveData.cell === cpuThreat) blocksMade++;
        else missedBlocks++;
      }
      if (countWinningThreats(moveData.board, PLAYERS.USER) >= 2) {
        offensiveForksCreated++;
      }
    }
  }

  return blocksMade >= 1 && missedBlocks === 0 && offensiveForksCreated === 0;
}

/**
 * Detects opening move patterns based on user's first two choices.
 * @param {ReadonlyArray<number>} userPlayedCells - User played cells.
 * @param {Array<{ id: string, name: string }>} detected - Accumulator list.
 */
function detectOpeningPatterns(userPlayedCells, detected) {
  const openingMove = userPlayedCells[0];
  if (openingMove === BOARD_CELLS.CENTER) {
    detected.push({ id: 'center_first', name: 'Center first' });
  }
  if (BOARD_CELLS.EDGES.includes(openingMove)) {
    detected.push({ id: 'edge_opener', name: 'Edge opener' });
  }
  if (userPlayedCells.length >= 2 && BOARD_CELLS.CORNERS.includes(openingMove)) {
    if (areOppositeCorners(openingMove, userPlayedCells[1])) {
      detected.push({ id: 'corner_opposite', name: 'Corner then opposite corner' });
    }
  }
}

/**
 * Analyzes the user's move history in a completed match and detects
 * signature play patterns.
 *
 * @param {ReadonlyArray<{ i: number }>} userMoveHistory - List of user move objects with cell index `i`.
 * @param {ReadonlyArray<object>} fullMatchMoves - List of all moves made by both players.
 * @returns {Array<{ id: string, name: string }>} Detected strategy patterns.
 */
export function detectPlayPatterns(userMoveHistory, fullMatchMoves) {
  if (!userMoveHistory || !userMoveHistory.length) return [];
  const userPlayedCells = userMoveHistory.map(historyItem => historyItem.i);
  const detectedPatterns = [];

  detectOpeningPatterns(userPlayedCells, detectedPatterns);
  if (checkAlwaysBlocksPattern(fullMatchMoves)) {
    detectedPatterns.push({ id: 'always_blocks', name: 'Always blocks, never attacks' });
  }

  return detectedPatterns;
}
