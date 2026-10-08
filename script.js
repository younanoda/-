const SIZE = 8;
// =====================================
// 先読み設定
// =====================================
const SEARCH_DEPTH = 6;
const MAX_BRANCHES = 8;
const WINRATE_SCALE = 180;
// =====================================
// CPU設定
// =====================================
let gameMode = "human";
let cpuLevel = "easy";
// CPUは白
const CPU_PLAYER = 2;
// CPUの通常難易度
const CPU_SETTINGS = {
  easy: {
    depth: 1,
    branches: 3
  },
  normal: {
    depth: 3,
    branches: 5
  },
  hard: {
    depth: 5,
    branches: 8
  },
  // 接待用
  hospitality: {
    depth: 4,
    branches: 6
  }
};
// =====================================
// 接待モード用
// =====================================
// CPUが今までに打った回数
let cpuMoveCount = 0;
// 接待時の探索深度
const HOSPITALITY_DEPTH = 4;
// 接待時の最大候補数
const HOSPITALITY_BRANCHES = 8;
// =====================================
// ゲーム状態
// =====================================
let board = [];
let currentPlayer = 1;
let analysisTimer = null;
let cpuThinking = false;
// =====================================
// 8方向
// =====================================
const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];
// =====================================
// 盤面の位置価値
// =====================================
const POSITION_WEIGHTS = [
  [120, -35, 20, 10, 10, 20, -35, 120],
  [-35, -60, -10, -5, -5, -10, -60, -35],
  [20, -10, 15, 5, 5, 15, -10, 20],
  [10, -5, 5, 3, 3, 5, -5, 10],
  [10, -5, 5, 3, 3, 5, -5, 10],
  [20, -10, 15, 5, 5, 15, -10, 20],
  [-35, -60, -10, -5, -5, -10, -60, -35],
  [120, -35, 20, 10, 10, 20, -35, 120]
];
// =====================================
// HTML取得
// =====================================
const boardElement =
  document.getElementById("board");
const blackCountElement =
  document.getElementById("blackCount");
const whiteCountElement =
  document.getElementById("whiteCount");
const turnElement =
  document.getElementById("turn");
const messageElement =
  document.getElementById("message");
const resetButton =
  document.getElementById("resetButton");
const blackPercentElement =
  document.getElementById("blackPercent");
const whitePercentElement =
  document.getElementById("whitePercent");
const blackAdvantageElement =
  document.getElementById("blackAdvantage");
const whiteAdvantageElement =
  document.getElementById("whiteAdvantage");
const analysisMessageElement =
  document.getElementById("analysisMessage");
// モードボタン
const humanModeButton =
  document.getElementById(
    "humanModeButton"
  );
const cpuModeButton =
  document.getElementById(
    "cpuModeButton"
  );
const difficultyArea =
  document.getElementById(
    "difficultyArea"
  );
// 難易度ボタン
const difficultyButtons =
  document.querySelectorAll(
    ".difficulty-button"
  );
// =====================================
// モード選択
// =====================================
humanModeButton.addEventListener(
  "click",
  () => {
    gameMode = "human";
    humanModeButton.classList.add(
      "selected"
    );
    cpuModeButton.classList.remove(
      "selected"
    );
    difficultyArea.classList.add(
      "hidden"
    );
    resetGame();
  }
);
cpuModeButton.addEventListener(
  "click",
  () => {
    gameMode = "cpu";
    cpuModeButton.classList.add(
      "selected"
    );
    humanModeButton.classList.remove(
      "selected"
    );
    difficultyArea.classList.remove(
      "hidden"
    );
    resetGame();
  }
);
// =====================================
// 難易度選択
// =====================================
difficultyButtons.forEach(
  button => {
    button.addEventListener(
      "click",
      () => {
        cpuLevel =
          button.dataset.level;
        difficultyButtons.forEach(
          other => {
            other.classList.remove(
              "selected"
            );
          }
        );
        button.classList.add(
          "selected"
        );
        if (
          gameMode === "cpu"
        ) {
          resetGame();
        }
      }
    );
  }
);
// =====================================
// ゲーム開始
// =====================================
function resetGame() {
  board = Array.from(
    {
      length: SIZE
    },
    () =>
      Array(SIZE).fill(0)
  );
  // 初期配置
  board[3][3] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  board[4][4] = 2;
  currentPlayer = 1;
  cpuThinking = false;
  // 接待カウンターをリセット
  cpuMoveCount = 0;
  messageElement.textContent =
    "黒からスタート！";
  render();
}
// =====================================
// 盤面表示
// =====================================
function render() {
  boardElement.innerHTML = "";
  const validMoves =
    getValidMoves(
      board,
      currentPlayer
    );
  const validSet =
    new Set(
      validMoves.map(
        move =>
          `${move.row},${move.col}`
      )
    );
  for (
    let row = 0;
    row < SIZE;
    row++
  ) {
    for (
      let col = 0;
      col < SIZE;
      col++
    ) {
      const cell =
        document.createElement(
          "button"
        );
      cell.type = "button";
      cell.className = "cell";
      // 人間が操作できるターン
      if (
        validSet.has(
          `${row},${col}`
        ) &&
        !(
          gameMode === "cpu" &&
          currentPlayer === CPU_PLAYER
        )
      ) {
        cell.classList.add(
          "valid"
        );
      }
      // 石
      if (
        board[row][col] !== 0
      ) {
        const piece =
          document.createElement(
            "div"
          );
        piece.classList.add(
          "piece"
        );
        if (
          board[row][col] === 1
        ) {
          piece.classList.add(
            "black"
          );
        } else {
          piece.classList.add(
            "white"
          );
        }
        cell.appendChild(
          piece
        );
      }
      cell.addEventListener(
        "click",
        () =>
          placePiece(
            row,
            col
          )
      );
      boardElement.appendChild(
        cell
      );
    }
  }
  updateScore();
  updateTurn();
  updateAdvantage();
  // CPUターン
  if (
    gameMode === "cpu" &&
    currentPlayer === CPU_PLAYER &&
    !cpuThinking
  ) {
    cpuThinking = true;
    if (
      cpuLevel === "hospitality"
    ) {
      messageElement.textContent =
        "🎁 接待CPUが考えています…";
    }
    else {
      messageElement.textContent =
        `CPU（${difficultyName()}）が考えています…`;
    }
    setTimeout(
      cpuMove,
      250
    );
  }
}
// =====================================
// プレイヤー名
// =====================================
function playerName(
  player
) {
  return player === 1
    ? "黒"
    : "白";
}
// =====================================
// 難易度名
// =====================================
function difficultyName() {
  if (
    cpuLevel === "easy"
  ) {
    return "初級";
  }
  if (
    cpuLevel === "normal"
  ) {
    return "中級";
  }
  if (
    cpuLevel === "hard"
  ) {
    return "上級";
  }
  return "接待";
}
// =====================================
// 石を置く
// =====================================
function placePiece(
  row,
  col
) {
  // CPU思考中
  if (
    cpuThinking
  ) {
    return;
  }
  // CPUターン
  if (
    gameMode === "cpu" &&
    currentPlayer === CPU_PLAYER
  ) {
    return;
  }
  if (
    board[row][col] !== 0
  ) {
    return;
  }
  const flips =
    getFlips(
      board,
      row,
      col,
      currentPlayer
    );
  if (
    flips.length === 0
  ) {
    messageElement.textContent =
      "そこには置けません！";
    return;
  }
  board[row][col] =
    currentPlayer;
  // ひっくり返す
  for (
    const [r, c]
    of flips
  ) {
    board[r][c] =
      currentPlayer;
  }
  // ターン交代
  currentPlayer =
    currentPlayer === 1
      ? 2
      : 1;
  handleNextTurn();
}
// =====================================
// 次のターン処理
// =====================================
function handleNextTurn() {
  const nextMoves =
    getValidMoves(
      board,
      currentPlayer
    );
  // 置けない
  if (
    nextMoves.length === 0
  ) {
    const otherPlayer =
      currentPlayer === 1
        ? 2
        : 1;
    const otherMoves =
      getValidMoves(
        board,
        otherPlayer
      );
    // 両者置けない
    if (
      otherMoves.length === 0
    ) {
      cpuThinking = false;
      render();
      endGame();
      return;
    }
    // パス
    messageElement.textContent =
      `${playerName(currentPlayer)}はパス！`;
    currentPlayer =
      otherPlayer;
  }
  cpuThinking = false;
  render();
}
// =====================================
// CPUの手
// =====================================
function cpuMove() {
  const moves =
    getValidMoves(
      board,
      CPU_PLAYER
    );
  // 置けない
  if (
    moves.length === 0
  ) {
    cpuThinking = false;
    handleNextTurn();
    return;
  }
  let move;
  // =================================
  // 接待
  // =================================
  if (
    cpuLevel === "hospitality"
  ) {
    move =
      chooseHospitalityMove(
        moves
      );
  }
  // =================================
  // 初級
  // =================================
  else if (
    cpuLevel === "easy"
  ) {
    move =
      chooseEasyMove(
        moves
      );
  }
  // =================================
  // 中級・上級
  // =================================
  else {
    const settings =
      CPU_SETTINGS[
        cpuLevel
      ];
    move =
      chooseBestCPUMove(
        moves,
        settings.depth,
        settings.branches
      );
  }
  // CPUが置く
  const flips =
    getFlips(
      board,
      move.row,
      move.col,
      CPU_PLAYER
    );
  board[
    move.row
  ][
    move.col
  ] =
    CPU_PLAYER;
  for (
    const [r, c]
    of flips
  ) {
    board[r][c] =
      CPU_PLAYER;
  }
  // CPUの手数を1増やす
  cpuMoveCount++;
  currentPlayer = 1;
  cpuThinking = false;
  if (
    cpuLevel === "hospitality"
  ) {
    const target =
      getHospitalityTarget();
    messageElement.textContent =
      `すごい^ ^`;
  }
  else {
    messageElement.textContent =
      "あなたのターン";
  }
  handleNextTurn();
}
// =====================================
// 接待の目標勝率
// =====================================
function getHospitalityTarget() {
  /*
    CPUが打った直後の目標
    1手目 → 49%
    2手目 → 48%
    3手目 → 47%
    4手目 → 46%
    ...
    ただし0%以下にはしない。
  */
  return Math.max(
    0,
    50 - cpuMoveCount
  );
}
// =====================================
// 接待CPU
// =====================================
function chooseHospitalityMove(
  moves
) {
  /*
    CPUが打った「後」の盤面を
    それぞれ6手先まで分析する。
    その結果の黒勝率が、
      50% - CPUの手数
    に一番近くなる手を選ぶ。
  */
  const target =
    Math.max(
      0,
      50 - (
        cpuMoveCount + 1
      )
    );
  // 候補をある程度絞る
  const sortedMoves =
    sortMoves(
      board,
      moves,
      CPU_PLAYER
    );
  const searchMoves =
    sortedMoves.slice(
      0,
      HOSPITALITY_BRANCHES
    );
  let bestMove =
    searchMoves[0];
  let bestDifference =
    Infinity;
  let bestScore =
    Infinity;
  for (
    const move
    of searchMoves
  ) {
    const nextBoard =
      makeMove(
        board,
        move,
        CPU_PLAYER
      );
    /*
      CPUが打った直後なので、
      次は黒のターン。
      そこから5手先を読む。
    */
    const score =
      minimax(
        nextBoard,
        1,
        HOSPITALITY_DEPTH,
        -Infinity,
        Infinity
      );
    const blackWinRate =
      evaluationToWinRate(
        score
      );
    const difference =
      Math.abs(
        blackWinRate -
        target
      );
    /*
      目標との差が小さい手を優先。
      同じくらいなら、
      CPU側に少し有利な手を選ぶ。
    */
    if (
      difference <
      bestDifference
    ) {
      bestDifference =
        difference;
      bestMove =
        move;
      bestScore =
        score;
    }
    else if (
      difference ===
      bestDifference
    ) {
      if (
        score < bestScore
      ) {
        bestMove =
          move;
        bestScore =
          score;
      }
    }
  }
  return bestMove;
}
// =====================================
// 初級CPU
// =====================================
function chooseEasyMove(
  moves
) {
  const corners =
    moves.filter(
      move =>
        isCorner(move)
    );
  if (
    corners.length > 0 &&
    Math.random() < 0.7
  ) {
    return corners[
      Math.floor(
        Math.random() *
        corners.length
      )
    ];
  }
  return moves[
    Math.floor(
      Math.random() *
      moves.length
    )
  ];
}
// =====================================
// 中級・上級CPU
// =====================================
function chooseBestCPUMove(
  moves,
  depth,
  maxBranches
) {
  const sortedMoves =
    sortMoves(
      board,
      moves,
      CPU_PLAYER
    );
  const searchMoves =
    sortedMoves.slice(
      0,
      maxBranches
    );
  let bestMove =
    searchMoves[0];
  let bestScore =
    Infinity;
  for (
    const move
    of searchMoves
  ) {
    const nextBoard =
      makeMove(
        board,
        move,
        CPU_PLAYER
      );
    const score =
      minimaxCPU(
        nextBoard,
        1,
        depth - 1,
        -Infinity,
        Infinity,
        maxBranches
      );
    if (
      score < bestScore
    ) {
      bestScore =
        score;
      bestMove =
        move;
    }
  }
  return bestMove;
}
// =====================================
// CPU用Minimax
// =====================================
function minimaxCPU(
  position,
  player,
  depth,
  alpha,
  beta,
  maxBranches
) {
  if (
    depth <= 0
  ) {
    return evaluateBoard(
      position
    );
  }
  const moves =
    getValidMoves(
      position,
      player
    );
  if (
    moves.length === 0
  ) {
    const opponent =
      player === 1
        ? 2
        : 1;
    const opponentMoves =
      getValidMoves(
        position,
        opponent
      );
    if (
      opponentMoves.length === 0
    ) {
      return evaluateBoard(
        position
      );
    }
    return minimaxCPU(
      position,
      opponent,
      depth - 1,
      alpha,
      beta,
      maxBranches
    );
  }
  const sortedMoves =
    sortMoves(
      position,
      moves,
      player
    );
  const searchMoves =
    sortedMoves.slice(
      0,
      maxBranches
    );
  // 黒最大化
  if (
    player === 1
  ) {
    let best =
      -Infinity;
    for (
      const move
      of searchMoves
    ) {
      const nextBoard =
        makeMove(
          position,
          move,
          player
        );
      const score =
        minimaxCPU(
          nextBoard,
          2,
          depth - 1,
          alpha,
          beta,
          maxBranches
        );
      best =
        Math.max(
          best,
          score
        );
      alpha =
        Math.max(
          alpha,
          best
        );
      if (
        beta <= alpha
      ) {
        break;
      }
    }
    return best;
  }
  // 白最小化
  else {
    let best =
      Infinity;
    for (
      const move
      of searchMoves
    ) {
      const nextBoard =
        makeMove(
          position,
          move,
          player
        );
      const score =
        minimaxCPU(
          nextBoard,
          1,
          depth - 1,
          alpha,
          beta,
          maxBranches
        );
      best =
        Math.min(
          best,
          score
        );
      beta =
        Math.min(
          beta,
          best
        );
      if (
        beta <= alpha
      ) {
        break;
      }
    }
    return best;
  }
}
// =====================================
// 角判定
// =====================================
function isCorner(
  move
) {
  return (
    (
      move.row === 0 ||
      move.row === 7
    )
    &&
    (
      move.col === 0 ||
      move.col === 7
    )
  );
}
// =====================================
// ひっくり返せる石
// =====================================
function getFlips(
  position,
  row,
  col,
  player
) {
  if (
    position[row][col] !== 0
  ) {
    return [];
  }
  const opponent =
    player === 1
      ? 2
      : 1;
  const flips = [];
  for (
    const [dr, dc]
    of directions
  ) {
    let r =
      row + dr;
    let c =
      col + dc;
    const line = [];
    while (
      r >= 0 &&
      r < SIZE &&
      c >= 0 &&
      c < SIZE &&
      position[r][c] === opponent
    ) {
      line.push([
        r,
        c
      ]);
      r += dr;
      c += dc;
    }
    if (
      line.length > 0 &&
      r >= 0 &&
      r < SIZE &&
      c >= 0 &&
      c < SIZE &&
      position[r][c] === player
    ) {
      flips.push(
        ...line
      );
    }
  }
  return flips;
}
// =====================================
// 置ける場所
// =====================================
function getValidMoves(
  position,
  player
) {
  const moves = [];
  for (
    let row = 0;
    row < SIZE;
    row++
  ) {
    for (
      let col = 0;
      col < SIZE;
      col++
    ) {
      if (
        position[row][col] === 0 &&
        getFlips(
          position,
          row,
          col,
          player
        ).length > 0
      ) {
        moves.push({
          row,
          col
        });
      }
    }
  }
  return moves;
}
// =====================================
// 盤面コピー
// =====================================
function cloneBoard(
  position
) {
  return position.map(
    row =>
      row.slice()
  );
}
// =====================================
// 仮想的に石を置く
// =====================================
function makeMove(
  position,
  move,
  player
) {
  const newBoard =
    cloneBoard(
      position
    );
  const flips =
    getFlips(
      newBoard,
      move.row,
      move.col,
      player
    );
  newBoard[
    move.row
  ][
    move.col
  ] =
    player;
  for (
    const [r, c]
    of flips
  ) {
    newBoard[r][c] =
      player;
  }
  return newBoard;
}
// =====================================
// 石数
// =====================================
function countPieces(
  position
) {
  let black = 0;
  let white = 0;
  let empty = 0;
  for (
    let row = 0;
    row < SIZE;
    row++
  ) {
    for (
      let col = 0;
      col < SIZE;
      col++
    ) {
      if (
        position[row][col] === 1
      ) {
        black++;
      }
      else if (
        position[row][col] === 2
      ) {
        white++;
      }
      else {
        empty++;
      }
    }
  }
  return {
    black,
    white,
    empty
  };
}
// =====================================
// 盤面評価
// =====================================
function evaluateBoard(
  position
) {
  let score = 0;
  // 位置価値
  for (
    let row = 0;
    row < SIZE;
    row++
  ) {
    for (
      let col = 0;
      col < SIZE;
      col++
    ) {
      const piece =
        position[row][col];
      if (
        piece === 1
      ) {
        score +=
          POSITION_WEIGHTS[
            row
          ][
            col
          ];
      }
      else if (
        piece === 2
      ) {
        score -=
          POSITION_WEIGHTS[
            row
          ][
            col
          ];
      }
    }
  }
  // 合法手
  const blackMoves =
    getValidMoves(
      position,
      1
    ).length;
  const whiteMoves =
    getValidMoves(
      position,
      2
    ).length;
  score +=
    (
      blackMoves -
      whiteMoves
    ) * 8;
  // 角
  const corners = [
    [0, 0],
    [0, 7],
    [7, 0],
    [7, 7]
  ];
  for (
    const [r, c]
    of corners
  ) {
    if (
      position[r][c] === 1
    ) {
      score += 80;
    }
    else if (
      position[r][c] === 2
    ) {
      score -= 80;
    }
  }
  // 石数
  const pieces =
    countPieces(
      position
    );
  if (
    pieces.empty <= 20
  ) {
    score +=
      (
        pieces.black -
        pieces.white
      ) * 5;
  }
  else if (
    pieces.empty <= 40
  ) {
    score +=
      (
        pieces.black -
        pieces.white
      ) * 2;
  }
  // 終局
  if (
    pieces.empty === 0
  ) {
    if (
      pieces.black >
      pieces.white
    ) {
      score += 10000;
    }
    else if (
      pieces.white >
      pieces.black
    ) {
      score -= 10000;
    }
  }
  return score;
}
// =====================================
// 手の優先順位
// =====================================
function movePriority(
  position,
  move,
  player
) {
  let priority = 0;
  const row =
    move.row;
  const col =
    move.col;
  // 角
  if (
    (
      row === 0 ||
      row === 7
    )
    &&
    (
      col === 0 ||
      col === 7
    )
  ) {
    priority +=
      10000;
  }
  // 辺
  if (
    row === 0 ||
    row === 7 ||
    col === 0 ||
    col === 7
  ) {
    priority +=
      100;
  }
  // 置いた後の評価
  const nextBoard =
    makeMove(
      position,
      move,
      player
    );
  priority +=
    evaluateBoard(
      nextBoard
    ) * 0.5;
  return priority;
}
// =====================================
// 手を並べる
// =====================================
function sortMoves(
  position,
  moves,
  player
) {
  return moves
    .slice()
    .sort(
      (a, b) =>
        movePriority(
          position,
          b,
          player
        )
        -
        movePriority(
          position,
          a,
          player
        )
    );
}
// =====================================
// 6手先分析用Minimax
// =====================================
function minimax(
  position,
  player,
  depth,
  alpha,
  beta
) {
  const moves =
    getValidMoves(
      position,
      player
    );
  if (
    depth === 0
  ) {
    return evaluateBoard(
      position
    );
  }
  if (
    moves.length === 0
  ) {
    const opponent =
      player === 1
        ? 2
        : 1;
    const opponentMoves =
      getValidMoves(
        position,
        opponent
      );
    if (
      opponentMoves.length === 0
    ) {
      return evaluateBoard(
        position
      );
    }
    return minimax(
      position,
      opponent,
      depth - 1,
      alpha,
      beta
    );
  }
  const sortedMoves =
    sortMoves(
      position,
      moves,
      player
    );
  const searchMoves =
    sortedMoves.slice(
      0,
      MAX_BRANCHES
    );
  // 黒最大化
  if (
    player === 1
  ) {
    let bestScore =
      -Infinity;
    for (
      const move
      of searchMoves
    ) {
      const nextBoard =
        makeMove(
          position,
          move,
          player
        );
      const score =
        minimax(
          nextBoard,
          2,
          depth - 1,
          alpha,
          beta
        );
      bestScore =
        Math.max(
          bestScore,
          score
        );
      alpha =
        Math.max(
          alpha,
          bestScore
        );
      if (
        beta <= alpha
      ) {
        break;
      }
    }
    return bestScore;
  }
  // 白最小化
  else {
    let bestScore =
      Infinity;
    for (
      const move
      of searchMoves
    ) {
      const nextBoard =
        makeMove(
          position,
          move,
          player
        );
      const score =
        minimax(
          nextBoard,
          1,
          depth - 1,
          alpha,
          beta
        );
      bestScore =
        Math.min(
          bestScore,
          score
        );
      beta =
        Math.min(
          beta,
          bestScore
        );
      if (
        beta <= alpha
      ) {
        break;
      }
    }
    return bestScore;
  }
}
// =====================================
// 評価値 → 勝率
// =====================================
function evaluationToWinRate(
  score
) {
  let blackPercent =
    100 /
    (
      1 +
      Math.exp(
        -score /
        WINRATE_SCALE
      )
    );
  blackPercent =
    Math.round(
      blackPercent
    );
  blackPercent =
    Math.max(
      0,
      Math.min(
        100,
        blackPercent
      )
    );
  return blackPercent;
}
// =====================================
// 6手先の複数展開分析
// =====================================
function analyzeBranches() {
  const rootMoves =
    getValidMoves(
      board,
      currentPlayer
    );
  if (
    rootMoves.length === 0
  ) {
    return {
      score:
        evaluateBoard(
          board
        ),
      branches: 0
    };
  }
  const sortedMoves =
    sortMoves(
      board,
      rootMoves,
      currentPlayer
    );
  const searchMoves =
    sortedMoves.slice(
      0,
      MAX_BRANCHES
    );
  const scores = [];
  for (
    const move
    of searchMoves
  ) {
    const nextBoard =
      makeMove(
        board,
        move,
        currentPlayer
      );
    const nextPlayer =
      currentPlayer === 1
        ? 2
        : 1;
    const score =
      minimax(
        nextBoard,
        nextPlayer,
        SEARCH_DEPTH - 1,
        -Infinity,
        Infinity
      );
    scores.push({
      move,
      score
    });
  }
  let bestScore;
  if (
    currentPlayer === 1
  ) {
    bestScore =
      Math.max(
        ...scores.map(
          item =>
            item.score
        )
      );
  }
  else {
    bestScore =
      Math.min(
        ...scores.map(
          item =>
            item.score
        )
      );
  }
  return {
    score: bestScore,
    branches:
      scores.length
  };
}
// =====================================
// 形勢表示
// =====================================
function updateAdvantage() {
  if (
    analysisTimer
  ) {
    clearTimeout(
      analysisTimer
    );
  }
  analysisMessageElement.textContent =
    "分析中…";
  analysisTimer =
    setTimeout(
      analyzePosition,
      30
    );
}
// =====================================
// 形勢分析
// =====================================
function analyzePosition() {
  analysisMessageElement.textContent =
    "6手先まで複数展開を分析中…";
  const result =
    analyzeBranches();
  const blackPercent =
    evaluationToWinRate(
      result.score
    );
  const whitePercent =
    100 -
    blackPercent;
  blackPercentElement.textContent =
    blackPercent;
  whitePercentElement.textContent =
    whitePercent;
  blackAdvantageElement.style.width =
    `${blackPercent}%`;
  whiteAdvantageElement.style.width =
    `${whitePercent}%`;
  analysisMessageElement.textContent =
    `6手先・${result.branches}展開を分析済み`;
}
// =====================================
// 石数更新
// =====================================
function updateScore() {
  const pieces =
    countPieces(
      board
    );
  blackCountElement.textContent =
    pieces.black;
  whiteCountElement.textContent =
    pieces.white;
}
// =====================================
// ターン表示
// =====================================
function updateTurn() {
  if (
    gameMode === "cpu"
  ) {
    if (
      currentPlayer === 1
    ) {
      turnElement.textContent =
        "あなた（黒）のターン";
    }
    else {
      turnElement.textContent =
        `CPU（${difficultyName()}）のターン`;
    }
  }
  else {
    turnElement.textContent =
      `${playerName(
        currentPlayer
      )}のターン`;
  }
}
// =====================================
// ゲーム終了
// =====================================
function endGame() {
  const pieces =
    countPieces(
      board
    );
  turnElement.textContent =
    "ゲーム終了";
  if (
    pieces.black >
    pieces.white
  ) {
    if (
      gameMode === "cpu"
    ) {
      messageElement.textContent =
        `黒（あなた）の勝ち！ ${pieces.black} - ${pieces.white}`;
    }
    else {
      messageElement.textContent =
        `黒の勝ち！ ${pieces.black} - ${pieces.white}`;
    }
  }
  else if (
    pieces.white >
    pieces.black
  ) {
    if (
      gameMode === "cpu"
    ) {
      messageElement.textContent =
        `CPUの勝ち！ ${pieces.white} - ${pieces.black}`;
    }
    else {
      messageElement.textContent =
        `白の勝ち！ ${pieces.white} - ${pieces.black}`;
    }
  }
  else {
    messageElement.textContent =
      `引き分け！ ${pieces.black} - ${pieces.white}`;
  }
}
// =====================================
// リセット
// =====================================
resetButton.addEventListener(
  "click",
  () => {
    const confirmed =
      confirm(
        "現在の対局をリセットしますか？\n\n対局中の内容は失われます。"
      );
    if (
      confirmed
    ) {
      resetGame();
    }
  }
);
// =====================================
// ゲーム開始
// =====================================
resetGame();
