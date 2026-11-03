/**
 * @fileoverview Board UI component: renders the interactive 3x3 game board
 * with animated SVG marks, coordinate markers, and match replay overlays.
 */

import { formatCoordinates } from '../game.js';
import { PLAYERS } from '../constants.js';

/**
 * Creates an SVG mark for player X or O.
 * @param {string} player - 'X' or 'O'.
 * @returns {string} SVG HTML markup string.
 */
function createMarkSvg(player) {
  if (player === PLAYERS.USER) {
    return '<svg class="mark" viewBox="0 0 100 100"><path d="M24 24L76 76M76 24L24 76" pathLength="1"/></svg>';
  }
  return '<svg class="mark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="29" pathLength="1"/></svg>';
}

/**
 * Attaches visual replay tags (Best Move and Predicted Move) to a board cell button.
 * @param {HTMLButtonElement} cellButton - The cell button element.
 * @param {number} cellIndex - The 0-indexed cell.
 * @param {number|null} bestMoveIndex - Best move cell index.
 * @param {number|null} predictedMoveIndex - Predicted move cell index.
 */
function appendReplayTags(cellButton, cellIndex, bestMoveIndex, predictedMoveIndex) {
  const isBest = bestMoveIndex === cellIndex;
  const isPred = predictedMoveIndex === cellIndex;
  if (!isBest && !isPred) return;

  const tag = document.createElement('span');
  if (isBest && isPred) {
    tag.className = 'rep-tag rep-both';
    tag.textContent = '★ Best & Pred';
  } else if (isBest) {
    tag.className = 'rep-tag rep-best';
    tag.textContent = '★ Best';
  } else {
    tag.className = 'rep-tag rep-pred';
    tag.textContent = '✦ Pred';
  }
  cellButton.appendChild(tag);
}

/**
 * Creates and initializes a cell button element with mark or empty state.
 * @param {number} cellIndex - Cell index (0 to 8).
 * @param {object} options - Board render options.
 * @returns {HTMLButtonElement} Constructed button.
 */
function createCellButton(cellIndex, options) {
  const { board, isGameOver, isUserTurn, freshMoves } = options;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cell';
  button.setAttribute('role', 'gridcell');

  const coord = document.createElement('span');
  coord.className = 'coord';
  coord.textContent = `${Math.floor(cellIndex / 3) + 1},${(cellIndex % 3) + 1}`;
  button.appendChild(coord);

  const mark = board[cellIndex];
  if (mark) {
    button.classList.add(mark.toLowerCase());
    if (freshMoves && freshMoves.includes(cellIndex) && !isGameOver) button.classList.add('new');
    button.insertAdjacentHTML('beforeend', createMarkSvg(mark));
    button.disabled = true;
    button.setAttribute('aria-label', `${mark} at ${formatCoordinates(cellIndex)}`);
  } else {
    button.setAttribute('aria-label', `Empty, ${formatCoordinates(cellIndex)}`);
    if (isGameOver || !isUserTurn) button.disabled = true;
  }
  return button;
}

/**
 * Applies active overlays such as winning glow or replay indicators to a cell button.
 * @param {HTMLButtonElement} button - Target cell button.
 * @param {number} cellIndex - Cell index (0 to 8).
 * @param {object} options - Board render options.
 */
function applyCellDecorations(button, cellIndex, options) {
  const { isReplayMode, playedCell, bestMoveIndex, predictedMoveIndex, winningLine } = options;
  if (isReplayMode) {
    if (playedCell === cellIndex) button.classList.add('rep-played');
    appendReplayTags(button, cellIndex, bestMoveIndex, predictedMoveIndex);
  } else if (winningLine && winningLine.includes(cellIndex)) {
    button.classList.add('line');
  }
}

/**
 * Determines board display and marker overlays based on replay step.
 * @param {object} state - Game state object.
 * @returns {object} Calculated board display options.
 */
export function getBoardDisplayState(state) {
  const isReplayMode = state.isGameOver && state.matchMoves.length > 0;
  if (!isReplayMode) {
    return { board: state.board, playedCell: null, bestMoveIndex: null, predictedMoveIndex: null, isReplayMode: false };
  }
  const stepIdx = Math.max(0, Math.min(state.matchMoves.length, state.currentReplayStep));
  if (stepIdx === 0) {
    return { board: Array(9).fill(null), playedCell: null, bestMoveIndex: null, predictedMoveIndex: null, isReplayMode: true };
  }
  const stepData = state.matchMoves[stepIdx - 1];
  const isUser = stepData.player === PLAYERS.USER;
  return {
    board: stepData.board,
    playedCell: stepData.cell,
    bestMoveIndex: isUser ? stepData.bestMove : null,
    predictedMoveIndex: isUser ? stepData.predicted : null,
    isReplayMode: true
  };
}

/**
 * Renders the 3x3 board into the container element based on game or replay state.
 * @param {HTMLElement} container - The DOM element holding the board grid.
 * @param {object} options - State options.
 */
export function renderBoard(container, options) {
  if (!container) return;
  container.innerHTML = '';

  for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
    const button = createCellButton(cellIndex, options);
    applyCellDecorations(button, cellIndex, options);
    button.addEventListener('click', () => {
      if (options.onCellClick) options.onCellClick(cellIndex);
    });
    container.appendChild(button);
  }
}
