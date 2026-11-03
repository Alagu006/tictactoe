/**
 * @fileoverview Safe persistent storage and schema migration for the
 * habits model using browser localStorage. All operations are wrapped in try/catch.
 */

import { STORAGE_KEY, ALGORITHM_KEYS, MAX_MATCH_HISTORY } from './constants.js';

/**
 * Creates a fresh, empty statistical habits model.
 * @returns {object} Initialized model structure.
 */
export function createBlankModel() {
  return {
    games: 0,
    moves: 0,
    pos: Array(9).fill(0),
    mistakePos: Array(9).fill(0),
    patterns: {},
    state: {},
    trans: {},
    rec: { w: 0, d: 0, l: 0 },
    acc: {
      ens: [0, 0],
      perfect: [0, 0],
      habit: [0, 0],
      markov: [0, 0]
    },
    matchHistory: []
  };
}

/**
 * Migrates scalar and array statistics into the model.
 * @param {object} model - Model to populate.
 * @param {object} parsed - Parsed JSON data.
 */
function migrateCountsAndPositions(model, parsed) {
  if (typeof parsed.games === 'number') model.games = parsed.games;
  if (typeof parsed.moves === 'number') model.moves = parsed.moves;
  if (Array.isArray(parsed.pos) && parsed.pos.length === 9) {
    model.pos = parsed.pos.map(Number);
  }
  if (Array.isArray(parsed.mistakePos) && parsed.mistakePos.length === 9) {
    model.mistakePos = parsed.mistakePos.map(Number);
  }
}

/**
 * Migrates patterns, state boards, and markov transitions.
 * @param {object} model - Model to populate.
 * @param {object} parsed - Parsed JSON data.
 */
function migratePatternsAndTransitions(model, parsed) {
  if (parsed.patterns && typeof parsed.patterns === 'object') {
    for (const patternKey in parsed.patterns) {
      if (typeof parsed.patterns[patternKey] === 'number') {
        model.patterns[patternKey] = parsed.patterns[patternKey];
      }
    }
  }
  if (parsed.state && typeof parsed.state === 'object') {
    model.state = parsed.state;
  }
  if (parsed.trans && typeof parsed.trans === 'object') {
    model.trans = parsed.trans;
  }
}

/**
 * Migrates game win/draw/loss record and prediction accuracies.
 * @param {object} model - Model to populate.
 * @param {object} parsed - Parsed JSON data.
 */
function migrateRecordAndAccuracy(model, parsed) {
  if (parsed.rec && typeof parsed.rec === 'object') {
    model.rec = {
      w: Number(parsed.rec.w) || 0,
      d: Number(parsed.rec.d) || 0,
      l: Number(parsed.rec.l) || 0
    };
  }
  if (parsed.acc && typeof parsed.acc === 'object') {
    for (const algorithmKey of ALGORITHM_KEYS) {
      if (Array.isArray(parsed.acc[algorithmKey]) && parsed.acc[algorithmKey].length === 2) {
        model.acc[algorithmKey] = [
          Number(parsed.acc[algorithmKey][0]) || 0,
          Number(parsed.acc[algorithmKey][1]) || 0
        ];
      }
    }
  }
}

/**
 * Migrates match history array with length capping.
 * @param {object} model - Model to populate.
 * @param {object} parsed - Parsed JSON data.
 */
function migrateMatchHistory(model, parsed) {
  if (Array.isArray(parsed.matchHistory)) {
    model.matchHistory = parsed.matchHistory.slice(-MAX_MATCH_HISTORY);
  } else {
    model.matchHistory = [];
  }
}

/**
 * Reads, parses, and migrates the habits model from localStorage.
 * Guarantees existing data is never wiped or corrupted if keys are missing.
 *
 * @param {Storage} [customStorage] - Optional storage implementation for testing.
 * @returns {object} Migrated model ready for active gameplay.
 */
export function loadModel(customStorage) {
  const model = createBlankModel();
  const storage = customStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!storage) return model;

  try {
    const rawData = storage.getItem(STORAGE_KEY);
    if (!rawData) return model;

    const parsed = JSON.parse(rawData);
    if (!parsed || typeof parsed !== 'object') return model;

    migrateCountsAndPositions(model, parsed);
    migratePatternsAndTransitions(model, parsed);
    migrateRecordAndAccuracy(model, parsed);
    migrateMatchHistory(model, parsed);
  } catch (error) {
    console.warn('Failed to load or parse habits model from storage:', error);
  }

  return model;
}

/**
 * Saves the given model to localStorage safely.
 * @param {object} model - The habits statistical model.
 * @param {Storage} [customStorage] - Optional storage implementation for testing.
 * @returns {boolean} True if write succeeded, false otherwise.
 */
export function saveModel(model, customStorage) {
  const storage = customStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(model));
    return true;
  } catch (error) {
    console.warn('Failed to save habits model to storage:', error);
    return false;
  }
}

/**
 * Resets the stored model back to initial blank state.
 * @param {Storage} [customStorage] - Optional storage implementation for testing.
 * @returns {object} Fresh blank model.
 */
export function resetModel(customStorage) {
  const blankModel = createBlankModel();
  saveModel(blankModel, customStorage);
  return blankModel;
}
