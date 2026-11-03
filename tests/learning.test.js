import test from 'node:test';
import assert from 'node:assert/strict';
import {
  updateHabitCounts,
  updateGameRecord,
  recordMatchHistory,
  updatePatternCounts,
  learnFromFinishedMatch
} from '../src/learning.js';
import { createBlankModel } from '../src/storage.js';
import { PLAYERS } from '../src/constants.js';

test('Learning: updates habit counts, mistake tracking, and accuracies', () => {
  const model = createBlankModel();
  const userHistory = [
    {
      i: 4,
      key: '---------',
      ctx: 9,
      preds: { ens: 4, perfect: 4, habit: null, markov: null },
      sc: { 4: 0 }
    },
    {
      i: 1, // Suboptimal move: leads to -8, while perfect (cell 0) leads to 0 -> mistake!
      key: '----X---O',
      ctx: 4,
      preds: { ens: 0, perfect: 0, habit: 4, markov: 1 },
      sc: { 1: -8, 0: 0 }
    }
  ];

  updateHabitCounts(model, userHistory);

  assert.equal(model.moves, 2, 'Total moves should be 2');
  assert.equal(model.pos[4], 1, 'Cell 4 pos count should be 1');
  assert.equal(model.pos[1], 1, 'Cell 1 pos count should be 1');
  assert.equal(model.mistakePos[1], 1, 'Cell 1 should be marked as a mistake');
  assert.equal(model.mistakePos[4], 0, 'Cell 4 was not a mistake');
  assert.equal(model.state['---------'][4], 1, 'Board state cache should be updated');
  assert.equal(model.trans[4][1], 1, 'Markov transition count should be updated');

  // Algorithm accuracy checks
  assert.deepEqual(model.acc.ens, [1, 2], 'Ensemble hit on move 1, missed move 2');
  assert.deepEqual(model.acc.perfect, [1, 2], 'Perfect hit on move 1, missed move 2');
  assert.deepEqual(model.acc.markov, [1, 1], 'Markov hit on move 2');
});

test('Learning: updates game records for win, loss, and draw', () => {
  const model = createBlankModel();

  // 1. User win
  const userWonBoard = ['X', 'X', 'X', 'O', 'O', null, null, null, null];
  const winResult = updateGameRecord(model, userWonBoard);
  assert.equal(winResult, 'w');
  assert.equal(model.rec.w, 1);

  // 2. Computer win
  const cpuWonBoard = ['X', 'X', null, 'O', 'O', 'O', null, null, 'X'];
  const lossResult = updateGameRecord(model, cpuWonBoard);
  assert.equal(lossResult, 'l');
  assert.equal(model.rec.l, 1);

  // 3. Draw
  const drawBoard = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  const drawResult = updateGameRecord(model, drawBoard);
  assert.equal(drawResult, 'd');
  assert.equal(model.rec.d, 1);
});

test('Learning: records match history and trims to 100 entries', () => {
  const model = createBlankModel();
  // Pre-fill 99 matches
  for (let i = 1; i <= 99; i++) {
    model.matchHistory.push({ match: i, accuracy: 50, mistakes: 0, result: 'd', moves: 5 });
  }
  model.games = 99;

  const userHistory = [
    { i: 4, preds: { ens: 4, perfect: 4 }, sc: { 4: 0 } },
    { i: 0, preds: { ens: 0, perfect: 0 }, sc: { 0: 0 } }
  ];

  recordMatchHistory(model, userHistory, 'w');
  assert.equal(model.matchHistory.length, 100, 'Should reach exactly 100 entries');
  assert.equal(model.games, 100);

  // Add 101st match
  recordMatchHistory(model, userHistory, 'w');
  assert.equal(model.matchHistory.length, 100, 'Should be capped at 100 entries');
  assert.equal(model.matchHistory[model.matchHistory.length - 1].match, 101, 'Latest match should be preserved at the end');
  assert.equal(model.matchHistory[0].match, 2, 'Oldest match should have been shifted out');
});

test('Learning: updates pattern counts for detected strategies', () => {
  const model = createBlankModel();
  const userHistory = [{ i: 4 }];
  const matchMoves = [{ player: PLAYERS.USER, cell: 4, board: [null, null, null, null, 'X', null, null, null, null] }];

  updatePatternCounts(model, userHistory, matchMoves);
  assert.equal(model.patterns.center_first, 1, 'Should track center_first pattern');

  // Trigger same pattern again
  updatePatternCounts(model, userHistory, matchMoves);
  assert.equal(model.patterns.center_first, 2, 'Should increment pattern occurrences');
});

test('Learning: learnFromFinishedMatch orchestrates all updates cleanly', () => {
  const model = createBlankModel();
  const userHistory = [
    { i: 4, key: '---------', ctx: 9, preds: { ens: 4, perfect: 4, habit: null, markov: null }, sc: { 4: 0 } }
  ];
  const matchMoves = [
    { player: PLAYERS.USER, cell: 4, board: [null, null, null, null, 'X', null, null, null, null] }
  ];
  const board = ['X', 'X', 'X', 'O', 'O', null, null, null, null];

  const updatedModel = learnFromFinishedMatch(model, { board, userHistory, matchMoves });

  assert.equal(updatedModel.games, 1);
  assert.equal(updatedModel.moves, 1);
  assert.equal(updatedModel.rec.w, 1);
  assert.equal(updatedModel.matchHistory.length, 1);
  assert.equal(updatedModel.patterns.center_first, 1);
});
