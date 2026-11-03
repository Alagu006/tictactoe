import test from 'node:test';
import assert from 'node:assert/strict';
import { checkWinner, minimax, evaluateMovesForUser } from '../src/game.js';
import { PLAYERS } from '../src/constants.js';

test('Winner detection: rows, columns, diagonals, draws and active game', () => {
  // Empty board
  assert.equal(checkWinner(Array(9).fill(null)), null);

  // Horizontal wins
  assert.deepEqual(checkWinner(['X', 'X', 'X', null, 'O', 'O', null, null, null]), { player: 'X', line: [0, 1, 2] });
  assert.deepEqual(checkWinner([null, 'X', null, 'O', 'O', 'O', 'X', null, 'X']), { player: 'O', line: [3, 4, 5] });
  assert.deepEqual(checkWinner([null, 'O', null, null, 'O', null, 'X', 'X', 'X']), { player: 'X', line: [6, 7, 8] });

  // Vertical wins
  assert.deepEqual(checkWinner(['O', 'X', null, 'O', null, 'X', 'O', null, null]), { player: 'O', line: [0, 3, 6] });
  assert.deepEqual(checkWinner(['X', 'O', null, null, 'O', 'X', null, 'O', 'X']), { player: 'O', line: [1, 4, 7] });
  assert.deepEqual(checkWinner(['O', null, 'X', null, 'O', 'X', null, null, 'X']), { player: 'X', line: [2, 5, 8] });

  // Diagonal wins
  assert.deepEqual(checkWinner(['X', 'O', null, null, 'X', 'O', null, null, 'X']), { player: 'X', line: [0, 4, 8] });
  assert.deepEqual(checkWinner(['X', 'X', 'O', null, 'O', null, 'O', null, null]), { player: 'O', line: [2, 4, 6] });

  // Draw
  const drawBoard = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  assert.equal(checkWinner(drawBoard), null);
});

test('Minimax scoring evaluates game outcomes accurately', () => {
  // Winning board for X at depth 1
  const xCanWin = ['X', 'X', null, 'O', 'O', null, null, null, null];
  xCanWin[2] = 'X';
  assert.equal(minimax(xCanWin, PLAYERS.COMPUTER, 1), 9); // X won at depth 1 -> 10 - 1 = 9

  // Winning board for O at depth 1
  const oCanWin = ['O', 'O', null, 'X', 'X', null, null, null, null];
  oCanWin[2] = 'O';
  assert.equal(minimax(oCanWin, PLAYERS.USER, 1), -9); // O won at depth 1 -> 1 - 10 = -9

  // Empty board evaluated for X
  assert.equal(minimax(Array(9).fill(null), PLAYERS.USER, 0), 0); // Optimal play from start leads to draw (score 0)
});

test('evalUser scores each legal move from user perspective', () => {
  const board = ['X', 'X', null, 'O', 'O', null, null, null, null];
  const scores = evaluateMovesForUser(board);

  // Cell 2 gives immediate win for X (score = 9)
  assert.equal(scores[2], 9, 'Cell 2 should be winning move');
  // Cell 6 allows O to complete row 1 (cells 3,4,5) and win (score = -8)
  assert.ok(scores[6] < 0, 'Cell 6 fails to block O');
});
