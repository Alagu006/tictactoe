import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAllPredictions } from '../src/predictors.js';
import { evaluateMovesForUser } from '../src/game.js';
import { createBlankModel } from '../src/storage.js';

test('Perfect play predictor selects optimal minimax move and computes confidence', () => {
  const model = createBlankModel();
  const b = ['X', 'X', null, 'O', 'O', null, null, null, null];
  const scores = evaluateMovesForUser(b);
  const result = evaluateAllPredictions(b, model, 9, scores);

  assert.equal(result.preds.perfect, 2, 'Perfect play must pick the winning move (cell 2)');
  assert.ok(result.conf.perfect >= 50, 'Confidence for forced win should be high');
});

test('Habit predictor adapts to user positional habits', () => {
  const model = createBlankModel();
  model.moves = 20;
  model.pos[4] = 16;
  model.pos[0] = 4;

  const emptyBoard = Array(9).fill(null);
  const scores = evaluateMovesForUser(emptyBoard);
  const result = evaluateAllPredictions(emptyBoard, model, 9, scores);

  assert.equal(result.preds.habit, 4, 'Habit predictor should predict heavily favored center cell');
  assert.ok(result.conf.habit >= 50, 'Confidence for habit should reflect frequency');
});

test('Markov sequence predictor uses transition counts', () => {
  const model = createBlankModel();
  model.trans[0] = { 8: 5, 2: 1 };

  const b = ['X', null, null, null, 'O', null, null, null, null];
  const scores = evaluateMovesForUser(b);
  const result = evaluateAllPredictions(b, model, 0, scores);

  assert.equal(result.preds.markov, 8, 'Markov should predict most frequent follow-up move (cell 8)');
  assert.ok(result.conf.markov >= 60, 'Markov confidence should be high for 5 out of 6 transitions');
});

test('Combined ensemble model weights algorithms by past accuracy', () => {
  const model = createBlankModel();
  model.acc.perfect = [20, 20]; // 100%
  model.acc.habit = [1, 20];    // 5%
  model.acc.markov = [0, 0];
  model.moves = 10;
  model.pos[0] = 10; // habit prefers 0

  const b = ['X', 'X', null, 'O', 'O', null, null, null, null];
  const scores = evaluateMovesForUser(b);
  const result = evaluateAllPredictions(b, model, 9, scores);

  // Ensemble should favor perfect play (cell 2) over habit (cell 0) due to accuracy weighting
  assert.equal(result.preds.ens, 2, 'Ensemble should follow higher accuracy model');
  assert.ok(result.conf.ens >= 50, 'Ensemble confidence should be calculated');
});
