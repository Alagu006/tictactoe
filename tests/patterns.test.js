import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPlayPatterns } from '../src/patterns.js';
import { PLAYERS } from '../src/constants.js';

test('Patterns: detects Center First pattern', () => {
  const patterns = detectPlayPatterns(
    [{ i: 4 }],
    [{ player: PLAYERS.USER, cell: 4, board: [null, null, null, null, 'X', null, null, null, null] }]
  );

  assert.ok(patterns.some(p => p.id === 'center_first'), 'Should detect Center first');
});

test('Patterns: detects Edge Opener pattern', () => {
  const patterns = detectPlayPatterns(
    [{ i: 1 }],
    [{ player: PLAYERS.USER, cell: 1, board: [null, 'X', null, null, null, null, null, null, null] }]
  );

  assert.ok(patterns.some(p => p.id === 'edge_opener'), 'Should detect Edge opener');
});

test('Patterns: detects Corner then opposite corner pattern', () => {
  const patterns = detectPlayPatterns(
    [{ i: 0 }, { i: 8 }],
    [
      { player: PLAYERS.USER, cell: 0, board: ['X', null, null, null, null, null, null, null, null] },
      { player: PLAYERS.COMPUTER, cell: 4, board: ['X', null, null, null, 'O', null, null, null, null] },
      { player: PLAYERS.USER, cell: 8, board: ['X', null, null, null, 'O', null, null, null, 'X'] }
    ]
  );

  assert.ok(patterns.some(p => p.id === 'corner_opposite'), 'Should detect Corner then opposite corner');
});

test('Patterns: detects Always blocks, never attacks pattern', () => {
  const patterns = detectPlayPatterns(
    [{ i: 4 }, { i: 2 }],
    [
      { player: PLAYERS.USER, cell: 4, board: [null, null, null, null, 'X', null, null, null, null] },
      { player: PLAYERS.COMPUTER, cell: 0, board: ['O', null, null, null, 'X', null, null, null, null] },
      { player: PLAYERS.COMPUTER, cell: 1, board: ['O', 'O', null, null, 'X', null, null, null, null] }, // O threatens cell 2
      { player: PLAYERS.USER, cell: 2, board: ['O', 'O', 'X', null, 'X', null, null, null, null] }         // X blocks cell 2
    ]
  );

  assert.ok(patterns.some(p => p.id === 'always_blocks'), 'Should detect Always blocks, never attacks');
});
