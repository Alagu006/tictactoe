/**
 * @fileoverview Application entry point: wires state changes to UI components and DOM events.
 */

import { DIFFICULTY_LEVELS } from './constants.js';
import { checkWinner, evaluateMovesForUser } from './game.js';
import { evaluateAllPredictions } from './predictors.js';
import { selectComputerMove } from './computer.js';
import { loadModel, saveModel, resetModel } from './storage.js';
import { learnFromFinishedMatch } from './learning.js';
import { detectPlayPatterns } from './patterns.js';
import { createInitialState, resetGameState, recordUserMove, recordComputerMove, checkGameTermination } from './state.js';

import { renderScoreboard } from './ui/scoreboard.js';
import { renderBoard, getBoardDisplayState } from './ui/board.js';
import { renderReview } from './ui/review.js';
import { renderProgressChart } from './ui/chart.js';
import { renderHabits } from './ui/habits.js';
import { bindReplayKeyboardNavigation } from './ui/replay.js';

const dom = {
  score: document.getElementById('score'),
  board: document.getElementById('board'),
  status: document.getElementById('status'),
  difficultySelect: document.getElementById('level'),
  newYouBtn: document.getElementById('newYou'),
  newCpuBtn: document.getElementById('newCpu'),
  reviewSection: document.getElementById('review'),
  progressSection: document.getElementById('progress'),
  habitsSection: document.getElementById('habits')
};

let model = loadModel();
const state = createInitialState();

function refreshEvaluations() {
  const scores = evaluateMovesForUser(state.board);
  const evaluation = evaluateAllPredictions(state.board, model, state.lastUserMove, scores);
  state.currentScores = evaluation.scores;
  state.currentPredictions = evaluation.preds;
  state.currentConfidences = evaluation.conf;
}

function executeComputerTurn() {
  const level = dom.difficultySelect ? dom.difficultySelect.value : DIFFICULTY_LEVELS.MEDIUM;
  const move = selectComputerMove(state.board, level, model);
  if (move === null) return;
  recordComputerMove(state, move);
  checkGameTermination(state);
}

function handleUserMove(cellIndex) {
  if (state.isGameOver || !state.isUserTurn || state.board[cellIndex]) return;
  recordUserMove(state, cellIndex);

  if (checkGameTermination(state)) {
    state.currentReplayStep = state.matchMoves.length;
    renderAll();
    return;
  }

  state.isUserTurn = false;
  renderAll();

  setTimeout(() => {
    executeComputerTurn();
    state.isUserTurn = true;
    if (!state.isGameOver) refreshEvaluations();
    else state.currentReplayStep = state.matchMoves.length;
    renderAll();
  }, 420);
}

function startNewGame(cpuFirst) {
  resetGameState(state);
  if (cpuFirst) executeComputerTurn();
  refreshEvaluations();
  renderAll();
}

function setReplayStep(newStep) {
  if (!state.isGameOver || !state.matchMoves.length) return;
  state.currentReplayStep = Math.max(0, Math.min(state.matchMoves.length, newStep));
  renderAll();
}

function updateStatusMessage() {
  if (!dom.status) return;
  const outcome = checkWinner(state.board);
  dom.status.textContent = state.isGameOver
    ? (outcome ? (outcome.player === 'X' ? 'You win.' : 'The computer wins.') : 'It’s a draw.')
    : (state.isUserTurn ? 'Your turn.' : 'Computer is thinking…');
}

function renderAll() {
  renderScoreboard(dom.score, model.rec);
  updateStatusMessage();

  if (state.isGameOver && !state.hasLearned) {
    learnFromFinishedMatch(model, { board: state.board, userHistory: state.userHistory, matchMoves: state.matchMoves });
    saveModel(model);
    state.hasLearned = true;
  }

  const display = getBoardDisplayState(state);
  renderBoard(dom.board, {
    ...display,
    isGameOver: state.isGameOver,
    isUserTurn: state.isUserTurn,
    winningLine: state.winningLine,
    freshMoves: state.freshMoves,
    onCellClick: handleUserMove
  });

  const outcome = checkWinner(state.board);
  const patterns = state.isGameOver ? detectPlayPatterns(state.userHistory, state.matchMoves) : [];
  renderReview(dom.reviewSection, {
    isGameOver: state.isGameOver,
    winner: outcome ? outcome.player : null,
    userHistory: state.userHistory,
    matchMoves: state.matchMoves,
    detectedPatterns: patterns,
    totalGames: model.games,
    patternCounts: model.patterns || {},
    currentReplayStep: state.currentReplayStep,
    onStepChange: setReplayStep
  });

  renderProgressChart(dom.progressSection, model.matchHistory);
  renderHabits(dom.habitsSection, model, () => { model = resetModel(); renderAll(); });
}

bindReplayKeyboardNavigation(
  () => ({ isGameOver: state.isGameOver, totalSteps: state.matchMoves.length, currentStep: state.currentReplayStep }),
  setReplayStep
);

dom.newYouBtn?.addEventListener('click', () => startNewGame(false));
dom.newCpuBtn?.addEventListener('click', () => startNewGame(true));

startNewGame(false);
