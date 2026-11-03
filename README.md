# Tic-tac-toe Predictor

A dependency-free Tic-tac-toe web application where you play X against a computer playing O. While you play, four prediction models analyze your habits and guess your next move, Minimax powers unbeatable play, and post-match review provides turn-by-turn move replay, strategy pattern recognition, confidence scores, an SVG progress chart, and mistake heatmaps.

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended, tested on Node v22)

### Running the App Locally
Because modern JavaScript uses ES modules (`import`/`export`), the web app needs to be served over HTTP:

```bash
# Start a local static server
npm start
```
*Or using Python if preferred:*
```bash
python -m http.server 8080
```
Then open `http://localhost:8080` (or `http://localhost:3000`) in your browser.

### Running the Tests and Quality Checks
The test suite uses Node's native test runner (`node:test`) and requires zero dependencies:

```bash
# Run unit tests
npm test

# Run tests and verify all functions in src/ are 40 lines or fewer
npm run check
```

---

## File-by-File Project Map

```
tictactoe/
├── index.html            Semantic HTML markup and layout skeleton
├── styles.css            Design tokens, light/dark themes, and component styles
├── package.json          Project metadata, ES module declaration, test/start scripts
├── README.md             System architecture, algorithm explanations, and guide
├── scripts/
│   └── check-function-lengths.js Audits all functions in src/ to stay under 40 lines
├── src/
│   ├── constants.js      Lines, algorithm keys, difficulty modes, storage keys
│   ├── game.js           Pure Tic-tac-toe rules, winner check, minimax search (no DOM)
│   ├── predictors.js     The 4 prediction algorithms and confidence scoring (no DOM)
│   ├── computer.js       Move selection for Easy, Medium, Hard, and Adaptive (no DOM)
│   ├── storage.js        Safe localStorage load, save, reset, and schema migration
│   ├── review.js         Move quality classification, mistake tally, step descriptions
│   ├── patterns.js       Pattern-of-play detection (Center first, Edge opener, etc.)
│   ├── learning.js       Pure functions to update model stats & history from match (no DOM)
│   ├── state.js          Game-flow state: board, turn, move history, active step (no DOM)
│   ├── main.js           DOM event orchestration, wiring UI components to state
│   └── ui/
│       ├── scoreboard.js Scoreboard component (You, Draws, Computer)
│       ├── board.js      Interactive 3x3 board with animations & replay overlays
│       ├── review.js     Match review card, accuracy bars, and move list
│       ├── replay.js     Replay navigation stepper toolbar («, ‹, Step, ›, »)
│       ├── chart.js      Responsive SVG trend line chart (accuracy & mistakes)
│       └── habits.js     Move frequency grid, mistake heatmap, lifetime bars
└── tests/
    ├── game.test.js      Winner detection, board evaluation, and minimax scoring
    ├── predictors.test.js Tests for all 4 prediction algorithms and confidences
    ├── computer.test.js  Exhaustive search verifying Hard & Adaptive never lose
    ├── storage.test.js   Legacy v2 schema migration and 100-match history cap
    ├── patterns.test.js  Strategy pattern detection test suite
    └── learning.test.js  Match learning, stats, patterns, and history cap tests
```

---

## Algorithms Explained with Tiny Worked Examples

### 1. Minimax (Game Theory)
- **Concept**: Explores the entire recursive game tree to assign a minimax score to every position. A terminal win for user X yields `+(10 - depth)`, a computer win yields `-(10 - depth)`, and a draw yields `0`. At each turn, X picks the branch maximizing the score, while O picks the branch minimizing it.
- **Worked Example**:
  Suppose the board is:
  ```
  X | X | .      (Row 0: 0, 1, 2)
  O | O | .      (Row 1: 3, 4, 5)
  . | . | .      (Row 2: 6, 7, 8)
  ```
  It is X's turn:
  - If X plays cell `2`: X wins immediately at depth 1. Minimax score = `10 - 1 = +9`.
  - If X plays cell `6`: X doesn't win immediately. O will play cell `5` on the next turn and win immediately at depth 2 (`2 - 10 = -8`).
  - X chooses `max(+9, -8) = +9`, correctly taking cell `2`.

---

### 2. Perfect Play Predictor (`perfect`)
- **Concept**: Assumes the human player will choose a move that maximizes their minimax score. It runs minimax from the user's perspective across all legal cells.
- **Confidence Scoring**: Softmax temperature scaling over available move scores:
  $$\text{weight}_i = \exp\left(\frac{s_i - s_{\max}}{2.0}\right)$$
- **Worked Example**:
  If one move wins ($s = 9$) and three moves lose ($s = -8$):
  - $\text{weight}_{\text{win}} = \exp(0) = 1.0$
  - $\text{weight}_{\text{loss}} = \exp(-17/2.0) \approx 0.0002$
  - $\text{Confidence} = \frac{1.0}{1.0 + 3 \times 0.0002} \approx 99\%$.

---

### 3. Habit Profile Predictor (`habit`)
- **Concept**: Tracks player behavioral biases. It combines exact board layout history with lifetime square preferences, weighting exact board match history 3x higher:
  $$\text{Weight}(i) = (\text{state}[boardKey][i] \times 3) + \frac{\text{pos}[i]}{\text{totalLifetimeMoves}}$$
- **Worked Example**:
  Suppose you have played 100 moves lifetime, 40 of which were in the center (cell 4). You've encountered the current board state once before and played the center:
  - Weight for cell 4 = $(1 \times 3) + \frac{40}{100} = 3.4$.
  - Weight for another cell with 0 state history and 10 lifetime moves = $(0 \times 3) + \frac{10}{100} = 0.1$.
  - The model strongly predicts cell `4` with $\approx 97\%$ confidence.

---

### 4. Move Sequence Predictor (`markov`)
- **Concept**: Models human transitions from the previous move $A$ to next move $B$ using a 1st-order Markov chain.
- **Worked Example**:
  Suppose user's previous move was cell `0`. In past games, after cell `0`, the user played cell `8` three times and cell `4` once. Cells `4` and `8` are both currently empty:
  - Total historical transitions to currently empty cells = $3 + 1 = 4$.
  - Move `8` probability = $\frac{3}{4} = 75\%$.
  - Prediction: cell `8` with $75\%$ confidence.

---

### 5. Combined Ensemble Predictor (`ens`)
- **Concept**: Runs a weighted majority vote across Perfect Play, Habit Profile, and Move Sequence. Each algorithm's vote weight is its historical Laplace-smoothed accuracy:
  $$\text{Weight} = \frac{\text{hits} + 1}{\text{attempts} + 2}$$
- **Worked Example**:
  Suppose:
  - Perfect Play accuracy is 80% $\to$ vote weight $\approx 0.81$, votes for cell `2`.
  - Habit Profile accuracy is 40% $\to$ vote weight $\approx 0.42$, votes for cell `4`.
  - Markov sequence accuracy is 20% $\to$ vote weight $\approx 0.25$, votes for cell `4`.
  - Vote total for cell `2`: $0.81$
  - Vote total for cell `4`: $0.42 + 0.25 = 0.67$
  - Ensemble picks cell `2` with $\frac{0.81}{0.81 + 0.67} \approx 55\%$ confidence.

---

## Data Format & Persistence

Data is stored in browser `localStorage` under the key `'ttt-habits-v2'`:

```json
{
  "games": 12,
  "moves": 58,
  "pos": [14, 4, 8, 2, 20, 2, 4, 1, 3],
  "mistakePos": [1, 0, 2, 0, 0, 0, 1, 0, 0],
  "patterns": {
    "center_first": 8,
    "corner_opposite": 3
  },
  "state": {
    "---------": { "4": 8, "0": 4 },
    "----X----": { "0": 2, "2": 3 }
  },
  "trans": {
    "4": { "0": 5, "8": 3 },
    "0": { "8": 4 }
  },
  "rec": { "w": 6, "d": 4, "l": 2 },
  "acc": {
    "ens": [38, 58],
    "perfect": [42, 58],
    "habit": [35, 58],
    "markov": [22, 50]
  },
  "matchHistory": [
    {
      "match": 1,
      "accuracy": 80,
      "mistakes": 0,
      "result": "w",
      "moves": 5
    }
  ]
}
```

- **Backward Compatibility**: `loadModel()` in `src/storage.js` safely migrates legacy saves missing `patterns`, `mistakePos`, or `matchHistory` without losing past statistics.
- **History Cap**: `matchHistory` is capped at the 100 most recent matches.

---

## How to Extend the Application

### Adding a New Prediction Algorithm
1. Open `src/constants.js`:
   - Add your key to `ALGORITHM_KEYS`: `['ens', 'perfect', 'habit', 'markov', 'myAlgo']`.
   - Add display name to `ALGORITHM_NAMES`: `{ ..., myAlgo: 'My Algorithm' }`.
2. Open `src/storage.js`:
   - In `createBlankModel()`, initialize accuracy tracking: `acc: { ..., myAlgo: [0, 0] }`.
3. Open `src/predictors.js`:
   - Write your pure predictor function:
     ```javascript
     export function predictMyAlgo(board, model) {
       // Return { move: number|null, confidence: number|null }
     }
     ```
   - Call it in `evaluateAllPredictions()` and include its vote in `predictEnsemble()`.
4. Open `tests/predictors.test.js`:
   - Add a unit test verifying prediction and confidence bounds.

### Adding a New Computer Difficulty Level
1. Open `src/constants.js`:
   - Add your level to `DIFFICULTY_LEVELS`: `{ ..., CHAOTIC: 'chaotic' }`.
2. Open `src/computer.js`:
   - Implement your move selector:
     ```javascript
     export function selectChaoticMove(board) {
       // Return cell index 0..8
     }
     ```
   - Add a case in `selectComputerMove()`.
3. Open `index.html`:
   - Add the `<option value="chaotic">Chaotic</option>` to `<select id="level">`.
4. Open `tests/computer.test.js`:
   - Add a test verifying the computer always returns legal moves.
