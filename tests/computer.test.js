import test from 'node:test';
import assert from 'node:assert/strict';
import { checkWinner, minimax, getLegalMoves } from '../src/game.js';
import { selectHardMove, selectAdaptiveMove, selectComputerMove } from '../src/computer.js';
import { createBlankModel } from '../src/storage.js';
import { PLAYERS } from '../src/constants.js';

test('Hard computer never loses against any human move sequence (User X starts)', () => {
  function playHard(b) {
    const w = checkWinner(b);
    if (w) {
      if (w.player === PLAYERS.USER) throw new Error('Hard lost to X! Board: ' + JSON.stringify(b));
      return;
    }
    if (b.every(Boolean)) return;

    // X tries every legal move
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = PLAYERS.USER;
        const wAfterX = checkWinner(b);
        if (wAfterX) {
          if (wAfterX.player === PLAYERS.USER) throw new Error('Hard lost to X! Board: ' + JSON.stringify(b));
          b[i] = null;
          continue;
        }
        if (b.every(Boolean)) {
          b[i] = null;
          continue;
        }

        const m = selectHardMove(b);
        b[m] = PLAYERS.COMPUTER;
        playHard(b);
        b[m] = null;
        b[i] = null;
      }
    }
  }

  playHard(Array(9).fill(null));
});

test('Hard computer never loses when Computer O starts', () => {
  function playHardOFirst(b) {
    const w = checkWinner(b);
    if (w) {
      if (w.player === PLAYERS.USER) throw new Error('Hard lost to X! Board: ' + JSON.stringify(b));
      return;
    }
    if (b.every(Boolean)) return;

    const m = selectHardMove(b);
    b[m] = PLAYERS.COMPUTER;
    const wAfterO = checkWinner(b);
    if (!wAfterO && !b.every(Boolean)) {
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = PLAYERS.USER;
          playHardOFirst(b);
          b[i] = null;
        }
      }
    }
    b[m] = null;
  }

  playHardOFirst(Array(9).fill(null));
});

test('Adaptive computer never loses against any human move sequence (User X starts)', () => {
  const model = createBlankModel();

  function playAdaptive(b) {
    const w = checkWinner(b);
    if (w) {
      if (w.player === PLAYERS.USER) throw new Error('Adaptive lost to X! Board: ' + JSON.stringify(b));
      return;
    }
    if (b.every(Boolean)) return;

    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = PLAYERS.USER;
        const wAfterX = checkWinner(b);
        if (wAfterX) {
          if (wAfterX.player === PLAYERS.USER) throw new Error('Adaptive lost to X! Board: ' + JSON.stringify(b));
          b[i] = null;
          continue;
        }
        if (b.every(Boolean)) {
          b[i] = null;
          continue;
        }

        const m = selectAdaptiveMove(b, model);
        assert.ok(b[m] === null, 'Adaptive move must be empty cell');
        b[m] = PLAYERS.COMPUTER;
        playAdaptive(b);
        b[m] = null;
        b[i] = null;
      }
    }
  }

  playAdaptive(Array(9).fill(null));
});

test('Adaptive computer never loses when Computer O starts', () => {
  const model = createBlankModel();

  function playAdaptiveOFirst(b) {
    const w = checkWinner(b);
    if (w) {
      if (w.player === PLAYERS.USER) throw new Error('Adaptive lost to X! Board: ' + JSON.stringify(b));
      return;
    }
    if (b.every(Boolean)) return;

    const m = selectAdaptiveMove(b, model);
    assert.ok(b[m] === null, 'Adaptive move must be empty cell');
    b[m] = PLAYERS.COMPUTER;
    const wAfterO = checkWinner(b);
    if (!wAfterO && !b.every(Boolean)) {
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = PLAYERS.USER;
          playAdaptiveOFirst(b);
          b[i] = null;
        }
      }
    }
    b[m] = null;
  }

  playAdaptiveOFirst(Array(9).fill(null));
});

test('Easy and Medium pick valid legal moves', () => {
  const board = ['X', 'O', 'X', null, 'O', null, null, null, 'X'];
  const legal = [3, 5, 6, 7];
  const model = createBlankModel();

  for (let i = 0; i < 10; i++) {
    const easy = selectComputerMove(board, 'easy', model);
    assert.ok(legal.includes(easy), 'Easy must pick an empty cell');
    const med = selectComputerMove(board, 'medium', model);
    assert.ok(legal.includes(med), 'Medium must pick an empty cell');
  }
});
