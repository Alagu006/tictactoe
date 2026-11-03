import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModel, saveModel, createBlankModel } from '../src/storage.js';
import { STORAGE_KEY } from '../src/constants.js';

function createMockStorage(initial = {}) {
  const store = Object.assign({}, initial);
  return {
    getItem: (key) => store[key] !== undefined ? store[key] : null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; }
  };
}

test('Storage: loads and migrates legacy v2 data without losing statistics', () => {
  const legacyData = {
    games: 8,
    moves: 38,
    pos: [6, 2, 5, 1, 14, 2, 4, 1, 3],
    state: { '---------': { '4': 6, '0': 2 } },
    trans: { '4': { '0': 4, '2': 2 } },
    rec: { w: 4, d: 2, l: 2 },
    acc: { ens: [20, 35], perfect: [26, 35], habit: [24, 35], markov: [15, 30] }
    // No mistakePos, no patterns, no matchHistory
  };

  const mockStorage = createMockStorage({ [STORAGE_KEY]: JSON.stringify(legacyData) });
  const model = loadModel(mockStorage);

  assert.equal(model.games, 8);
  assert.equal(model.moves, 38);
  assert.deepEqual(model.rec, { w: 4, d: 2, l: 2 });
  assert.deepEqual(model.pos, legacyData.pos);
  assert.deepEqual(model.state, legacyData.state);
  assert.deepEqual(model.trans, legacyData.trans);
  assert.deepEqual(model.acc, legacyData.acc);

  // New fields initialized safely
  assert.ok(Array.isArray(model.mistakePos) && model.mistakePos.length === 9);
  assert.ok(model.patterns && typeof model.patterns === 'object');
  assert.ok(Array.isArray(model.matchHistory));
});

test('Storage: caps matchHistory at 100 entries', () => {
  const history120 = [];
  for (let i = 1; i <= 120; i++) {
    history120.push({ match: i, accuracy: 60, mistakes: 1, result: 'w', moves: 5 });
  }

  const mockStorage = createMockStorage({
    [STORAGE_KEY]: JSON.stringify({
      games: 120,
      moves: 500,
      pos: Array(9).fill(50),
      rec: { w: 60, d: 30, l: 30 },
      acc: { ens: [50, 100], perfect: [50, 100], habit: [50, 100], markov: [50, 100] },
      matchHistory: history120
    })
  });

  const model = loadModel(mockStorage);
  assert.equal(model.matchHistory.length, 100, 'Loaded match history should be capped at 100');
  assert.equal(model.matchHistory[model.matchHistory.length - 1].match, 120, 'Most recent match should be preserved');
});
