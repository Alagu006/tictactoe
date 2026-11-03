/**
 * @fileoverview The four prediction algorithms (Perfect Play, Habit Profile,
 * Move Sequence / Markov, and Combined Ensemble) along with confidence scoring.
 */

import { getLegalMoves, serializeBoard } from './game.js';

/**
 * Computes a softmax confidence percentage over scores of available moves.
 * @param {Record<number, number>} userScores - Move scores map.
 * @param {ReadonlyArray<number>} legalMoves - Legal move indices.
 * @param {number} topMove - Top move index.
 * @param {number} topScore - Top move score.
 * @returns {number} Confidence percentage (1 to 99).
 */
function computeSoftmaxConfidence(userScores, legalMoves, topMove, topScore) {
  let totalWeight = 0;
  let topWeight = 0;
  const temperature = 2.0;

  for (const moveIndex of legalMoves) {
    const score = userScores[moveIndex] !== undefined ? userScores[moveIndex] : -10;
    const weight = Math.exp((score - topScore) / temperature);
    if (moveIndex === topMove) topWeight = weight;
    totalWeight += weight;
  }

  return totalWeight > 0
    ? Math.min(99, Math.max(1, Math.round((100 * topWeight) / totalWeight)))
    : 50;
}

/**
 * ALGORITHM 1: PERFECT PLAY
 * Predicts the move that maximizes user's minimax score, with softmax confidence.
 *
 * @param {Record<number, number>} userScores - Map of legal move to minimax score.
 * @param {ReadonlyArray<string|null>} board - The 9-cell board state.
 * @returns {{ move: number|null, confidence: number|null }} Predicted move and percentage confidence.
 */
export function predictPerfectPlay(userScores, board) {
  const legalMoves = getLegalMoves(board);
  if (!legalMoves.length) return { move: null, confidence: null };

  let highestScore = -99;
  let optimalMove = legalMoves[0];

  for (const moveIndex of legalMoves) {
    const score = userScores[moveIndex];
    if (score !== undefined && score > highestScore) {
      highestScore = score;
      optimalMove = moveIndex;
    }
  }

  const confidence = computeSoftmaxConfidence(userScores, legalMoves, optimalMove, highestScore);
  return { move: optimalMove, confidence };
}

/**
 * Calculates habit weights for each legal move.
 * @param {ReadonlyArray<number>} legalMoves - Empty cells.
 * @param {object} model - Habits model.
 * @param {string} boardKey - Serialized board.
 * @returns {{ weights: Record<number, number>, total: number }} Computed weights.
 */
function calculateHabitWeights(legalMoves, model, boardKey) {
  const totalLifetimeMoves = model.pos.reduce((sum, count) => sum + count, 0);
  const stateCounts = model.state[boardKey] || {};
  let total = 0;
  const weights = {};

  for (const moveIndex of legalMoves) {
    const stateCount = stateCounts[moveIndex] || 0;
    const globalFreq = (model.pos[moveIndex] || 0) / totalLifetimeMoves;
    const combinedWeight = (stateCount * 3) + globalFreq;
    weights[moveIndex] = combinedWeight;
    total += combinedWeight;
  }
  return { weights, total };
}

/**
 * ALGORITHM 2: HABIT PROFILE
 * Predicts based on exact board state history (weighted 3x) and lifetime positional frequencies.
 *
 * @param {ReadonlyArray<string|null>} board - The 9-cell board state.
 * @param {object} model - The habits statistical model.
 * @returns {{ move: number|null, confidence: number|null }} Predicted move and percentage confidence.
 */
export function predictHabit(board, model) {
  const legalMoves = getLegalMoves(board);
  const totalMoves = model.pos.reduce((sum, count) => sum + count, 0);
  if (!legalMoves.length || totalMoves === 0) return { move: null, confidence: null };

  const { weights, total } = calculateHabitWeights(legalMoves, model, serializeBoard(board));
  let topWeight = -1;
  let predictedMove = legalMoves[0];

  for (const moveIndex of legalMoves) {
    if (weights[moveIndex] > topWeight) {
      topWeight = weights[moveIndex];
      predictedMove = moveIndex;
    }
  }

  const confidence = total > 0
    ? Math.min(99, Math.max(1, Math.round((100 * weights[predictedMove]) / total)))
    : Math.round(100 / legalMoves.length);

  return { move: predictedMove, confidence };
}

/**
 * ALGORITHM 3: MOVE SEQUENCE (MARKOV CHAIN)
 * Predicts based on empirical transition frequency from user's previous move.
 *
 * @param {ReadonlyArray<string|null>} board - The 9-cell board state.
 * @param {object} model - The habits statistical model.
 * @param {number|null} lastUserMove - Cell index of user's previous move.
 * @returns {{ move: number|null, confidence: number|null }} Predicted move and percentage confidence.
 */
export function predictMarkov(board, model, lastUserMove) {
  const legalMoves = getLegalMoves(board);
  if (!legalMoves.length || lastUserMove === null || lastUserMove === undefined) {
    return { move: null, confidence: null };
  }

  const transitions = model.trans[lastUserMove];
  if (!transitions) return { move: null, confidence: null };

  let totalTransitions = 0;
  for (const moveIndex of legalMoves) totalTransitions += (transitions[moveIndex] || 0);
  if (totalTransitions === 0) return { move: null, confidence: null };

  let highestCount = -1;
  let predictedMove = legalMoves[0];
  for (const moveIndex of legalMoves) {
    const count = transitions[moveIndex] || 0;
    if (count > highestCount) {
      highestCount = count;
      predictedMove = moveIndex;
    }
  }

  const confidence = Math.min(99, Math.max(1, Math.round((100 * (transitions[predictedMove] || 0)) / totalTransitions)));
  return { move: predictedMove, confidence };
}

/**
 * Tallies weighted votes across the sub-algorithms for each legal cell.
 * @param {Record<string, number|null>} algorithmPredictions - Predictions from sub-models.
 * @param {object} model - Habits model.
 * @param {ReadonlyArray<number>} legalMoves - Legal cells.
 * @returns {{ votes: Array<number>, totalWeight: number }} Vote totals.
 */
function tallyEnsembleVotes(algorithmPredictions, model, legalMoves) {
  const votes = Array(9).fill(0);
  let totalWeight = 0;

  for (const algorithmKey of ['perfect', 'habit', 'markov']) {
    const pick = algorithmPredictions[algorithmKey];
    if (pick !== null && pick !== undefined && legalMoves.includes(pick)) {
      const [hits, attempts] = model.acc[algorithmKey];
      const weight = (hits + 1) / (attempts + 2);
      votes[pick] += weight;
      totalWeight += weight;
    }
  }
  return { votes, totalWeight };
}

/**
 * ALGORITHM 4: COMBINED MODEL (ENSEMBLE)
 * Weighted majority vote where voting power is proportional to historical accuracy.
 *
 * @param {Record<string, number|null>} algorithmPredictions - Sub-model predictions.
 * @param {object} model - The habits statistical model.
 * @param {ReadonlyArray<number>} legalMoves - Currently available cell indices.
 * @returns {{ move: number|null, confidence: number|null }} Predicted move and percentage confidence.
 */
export function predictEnsemble(algorithmPredictions, model, legalMoves) {
  if (!legalMoves.length) return { move: null, confidence: null };

  const { votes, totalWeight } = tallyEnsembleVotes(algorithmPredictions, model, legalMoves);
  let topVotes = -1;
  let chosenMove = null;

  for (const moveIndex of legalMoves) {
    if (votes[moveIndex] > topVotes) {
      topVotes = votes[moveIndex];
      chosenMove = moveIndex;
    }
  }

  if (chosenMove === null) {
    chosenMove = algorithmPredictions.perfect !== null ? algorithmPredictions.perfect : legalMoves[0];
  }

  const confidence = totalWeight > 0 && topVotes >= 0
    ? Math.min(99, Math.max(1, Math.round((100 * topVotes) / totalWeight)))
    : 50;

  return { move: chosenMove, confidence };
}

/**
 * Evaluates predictions and confidence percentages for all four algorithms.
 * @param {ReadonlyArray<string|null>} board - The 9-cell board state.
 * @param {object} model - The habits statistical model.
 * @param {number|null} lastUserMove - Cell index of user's previous move.
 * @param {Record<number, number>} [precomputedScores] - Optional precomputed user scores.
 * @returns {{ preds: Record<string, number|null>, conf: Record<string, number|null>, scores: Record<number, number> }}
 */
export function evaluateAllPredictions(board, model, lastUserMove, precomputedScores) {
  const scores = precomputedScores || {};
  const perfectResult = predictPerfectPlay(scores, board);
  const habitResult = predictHabit(board, model);
  const markovResult = predictMarkov(board, model, lastUserMove);

  const subPredictions = { perfect: perfectResult.move, habit: habitResult.move, markov: markovResult.move };
  const ensembleResult = predictEnsemble(subPredictions, model, getLegalMoves(board));

  return {
    preds: { perfect: perfectResult.move, habit: habitResult.move, markov: markovResult.move, ens: ensembleResult.move },
    conf: { perfect: perfectResult.confidence, habit: habitResult.confidence, markov: markovResult.confidence, ens: ensembleResult.confidence },
    scores
  };
}
