/**
 * @fileoverview Replay controls UI component: renders stepper navigation
 * and step summary explanations.
 */

import { getReplayStepSummary } from '../review.js';

/**
 * Attaches keyboard arrow and home/end listeners for match replay navigation.
 * @param {() => { isGameOver: boolean, totalSteps: number, currentStep: number }} getState - State accessor.
 * @param {(newStep: number) => void} onStepChange - Callback on step change.
 */
export function bindReplayKeyboardNavigation(getState, onStepChange) {
  window.addEventListener('keydown', (event) => {
    const { isGameOver, totalSteps, currentStep } = getState();
    if (!isGameOver || !totalSteps) return;
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT')) return;

    if (event.key === 'ArrowLeft') { event.preventDefault(); onStepChange(currentStep - 1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); onStepChange(currentStep + 1); }
    else if (event.key === 'Home') { event.preventDefault(); onStepChange(0); }
    else if (event.key === 'End') { event.preventDefault(); onStepChange(totalSteps); }
  });
}

/**
 * Renders the interactive match replay control bar.
 *
 * @param {HTMLElement} container - DOM element to render into.
 * @param {object} options - State options.
 * @param {number} options.currentStep - Current active replay step (0 to totalSteps).
 * @param {number} options.totalSteps - Total number of moves in the match.
 * @param {ReadonlyArray<object>} options.matchMoves - List of match moves.
 * @param {(step: number) => void} options.onStepChange - Callback when user navigates steps.
 */
export function renderReplayControls(container, options) {
  if (!container) return;

  const { currentStep, totalSteps, matchMoves, onStepChange } = options;
  const isAtStart = currentStep === 0;
  const isAtEnd = currentStep === totalSteps;
  const stepDescription = getReplayStepSummary(currentStep, matchMoves);

  container.innerHTML = `
    <div class="replay-head">
      <h3>Match replay</h3>
      <div class="replay-nav">
        <button class="btn btn-sm" id="repFirst" type="button" aria-label="First move" ${isAtStart ? 'disabled' : ''}>«</button>
        <button class="btn btn-sm" id="repPrev" type="button" aria-label="Previous move" ${isAtStart ? 'disabled' : ''}>‹</button>
        <span class="replay-step-txt" aria-live="polite">Step ${currentStep} / ${totalSteps}</span>
        <button class="btn btn-sm" id="repNext" type="button" aria-label="Next move" ${isAtEnd ? 'disabled' : ''}>›</button>
        <button class="btn btn-sm" id="repLast" type="button" aria-label="Last move" ${isAtEnd ? 'disabled' : ''}>»</button>
      </div>
    </div>
    <div class="replay-info">${stepDescription}</div>
  `;

  container.querySelector('#repFirst')?.addEventListener('click', () => onStepChange(0));
  container.querySelector('#repPrev')?.addEventListener('click', () => onStepChange(currentStep - 1));
  container.querySelector('#repNext')?.addEventListener('click', () => onStepChange(currentStep + 1));
  container.querySelector('#repLast')?.addEventListener('click', () => onStepChange(totalSteps));
}
