// DOM Elements
const cells = document.querySelectorAll("[data-cell]");
const statusDisplay = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");
const clearBtn = document.getElementById("clearBtn");
const pauseBtn = document.getElementById("pauseBtn");
const quitBtn = document.getElementById("quitBtn");
const colorXInput = document.getElementById("colorX");
const colorOInput = document.getElementById("colorO");
const applyColorsBtn = document.getElementById("applyColors");
const startBtn = document.getElementById("startBtn");
const descriptionPage = document.getElementById("descriptionPage");
const gamePage = document.getElementById("gamePage");
const modeToggle = document.getElementById("modeToggle");
const modeOptions = document.getElementById("modeOptions");
const difficultyOptions = document.getElementById("difficultyOptions");
const multiplayerSection = document.getElementById("multiplayerSection");
const generatePinBtn = document.getElementById("generatePinBtn");
const generatedCodeDisplay = document.getElementById("generatedCode");
const pinInput = document.getElementById("pinInput");
const joinBtn = document.getElementById("joinBtn");
const multiplayerStatus = document.getElementById("multiplayerStatus");
const chatSidebar = document.getElementById("chatSidebar");
const toggleChatBtn = document.getElementById("toggleChatBtn");
const chatContent = document.getElementById("chatContent");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChat");
const clickSound = document.getElementById("clickSound");
const winSound = document.getElementById("winSound");

// Game State
let isXNext = true; // Tracks whose turn it is
let gameActive = true; // Tracks if the game is active
let isPaused = false; // Tracks if the game is paused
let colorX = colorXInput.value; // Color for X
let colorO = colorOInput.value; // Color for O
let isAIMode = false; // Tracks if AI mode is active
let isOnlineMode = false; // Tracks if online mode is active
let aiDifficulty = "beginner"; // AI difficulty level
let playerSymbol = null; // Tracks player symbol in online mode
let peer = null; // PeerJS instance
let conn = null; // PeerJS connection
let board = Array(9).fill(null); // Game board
let moveQueue = []; // Queue for moves in online mode
let lastSyncTime = 0; // Tracks last sync time
let gameEndTimeout = null; // Timeout for auto-reset

const winningCombinations = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6] // Diagonals
];

// Start Game
startBtn.addEventListener("click", () => {
  descriptionPage.style.display = "none";
  gamePage.style.display = "block";
  toggleMultiplayerControls();
  playSound(clickSound);
});

// Play sound with error handling
function playSound(sound) {
  if (sound && sound.play) {
    sound.play().catch(err => console.log("Sound play error:", err));
  }
}

// Radial Mode Selector
modeToggle.addEventListener("click", () => {
  modeOptions.classList.toggle("active");
  if (!isAIMode) difficultyOptions.classList.remove("active");
  playSound(clickSound);
});

modeOptions.querySelectorAll(".radial-option").forEach(option => {
  option.addEventListener("click", (e) => {
    const mode = e.target.dataset.mode;
    isAIMode = mode === "ai";
    isOnlineMode = mode === "online";
    toggleMultiplayerControls();
    if (isAIMode) difficultyOptions.classList.add("active");
    else difficultyOptions.classList.remove("active");
    modeOptions.classList.remove("active");
    restartGame();
    playSound(clickSound);
  });
});

difficultyOptions.querySelectorAll(".radial-option").forEach(option => {
  option.addEventListener("click", (e) => {
    aiDifficulty = e.target.dataset.difficulty;
    difficultyOptions.classList.remove("active");
    if (isAIMode) restartGame();
    playSound(clickSound);
  });
});

// Toggle Multiplayer Controls
function toggleMultiplayerControls() {
  multiplayerSection.style.display = isOnlineMode ? "block" : "none";
  chatSidebar.style.display = isOnlineMode ? "block" : "none";
  chatContent.classList.remove("active");
  toggleChatBtn.textContent = "Open Comm";
  generatedCodeDisplay.textContent = "";
  multiplayerStatus.textContent = "";
  playerSymbol = null;
  if (peer) peer.destroy();
  conn = null;
  clearGrid();
}

// Generate Game Code
generatePinBtn.addEventListener("click", () => {
  if (peer) peer.destroy();

  if (typeof Peer !== 'function') {
    multiplayerStatus.textContent = "Error: PeerJS library not loaded.";
    return;
  }

  try {
    peer = new Peer(generatePinCode(), {
      debug: 2,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "turn:relay1.expressturn.com:3478", username: "user", credential: "pass" }
        ]
      }
    });

    peer.on('open', (id) => {
      generatedCodeDisplay.textContent = `Your Code: ${id}`;
      multiplayerStatus.textContent = "Waiting for opponent...";
      gameActive = true;
      statusDisplay.textContent = "Awaiting First Move...";
    });

    peer.on('connection', (connection) => {
      conn = connection;
      multiplayerStatus.textContent = "Opponent Connected!";
      setupConnection();
    });

    peer.on('error', (err) => {
      multiplayerStatus.textContent = `Connection Error: ${err.type}.`;
      console.error("PeerJS Error:", err);
    });

    playSound(clickSound);
  } catch (error) {
    multiplayerStatus.textContent = "Error initializing connection.";
    console.error("PeerJS initialization error:", error);
  }
});

function generatePinCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pin = "";
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

// Join Game
joinBtn.addEventListener("click", () => {
  const opponentCode = pinInput.value.trim().toUpperCase();
  if (!opponentCode) {
    multiplayerStatus.textContent = "Enter a code to join.";
    return;
  }

  if (!peer) {
    multiplayerStatus.textContent = "Generate your code first!";
    return;
  }

  try {
    conn = peer.connect(opponentCode, { reliable: true });
    multiplayerStatus.textContent = "Connecting...";
    setupConnection();
    playSound(clickSound);
  } catch (error) {
    multiplayerStatus.textContent = "Failed to connect.";
    console.error("Connection error:", error);
  }
});

// Setup PeerJS Connection
function setupConnection() {
  if (!conn) return;

  conn.on('open', () => {
    multiplayerStatus.textContent = "Connected! Ready to play.";
    chatContent.classList.add("active");
    toggleChatBtn.textContent = "Close Comm";
    statusDisplay.textContent = "Awaiting First Move...";
    gameActive = true;
    syncBoard();
    processMoveQueue();
  });

  conn.on('data', (data) => {
    handleConnectionData(data);
  });

  conn.on('close', () => {
    statusDisplay.textContent = "Opponent Disconnected.";
    gameActive = false;
    multiplayerStatus.textContent = "Disconnected.";
    chatContent.classList.remove("active");
    toggleChatBtn.textContent = "Open Comm";
  });

  conn.on('error', (err) => {
    console.error("Connection Error:", err);
    multiplayerStatus.textContent = "Connection Issue.";
  });
}

// Handle incoming connection data
function handleConnectionData(data) {
  if (!gameActive && data.type !== "clear" && data.type !== "gameOver") return;

  switch (data.type) {
    case "move":
      board = data.board;
      updateBoard();
      isXNext = !isXNext; // Toggle turn after opponent's move
      statusDisplay.textContent = `${isXNext ? "X" : "O"}'s Turn${playerSymbol ? ` (You are ${playerSymbol})` : ""}`;
      playSound(clickSound);
      checkGameEnd();
      break;
    case "chat":
      displayChatMessage(data.message);
      break;
    case "sync":
    case "clear":
      board = data.board;
      updateBoard();
      statusDisplay.textContent = "Awaiting First Move...";
      if (data.type === "clear") {
        gameActive = true;
        isPaused = false;
        isXNext = true;
        pauseBtn.textContent = "Pause";
      }
      break;
    case "gameOver":
      showWin(data.message);
      gameActive = false;
      playSound(winSound);
      scheduleAutoReset();
      break;
  }
}

// Draw Symbol
function drawSymbol(event) {
  if (!gameActive || isPaused) return;

  const cell = event.target;
  const index = [...cells].indexOf(cell);

  if (board[index]) return;

  if (isOnlineMode) {
    handleOnlineMove(index);
  } else {
    handleLocalMove(index);
  }
}

// Handle move in online mode
function handleOnlineMove(index) {
  if (!gameActive || isPaused || board[index]) return;

  // First move logic
  const isFirstMove = board.every(cell => !cell);
  if (isFirstMove && !playerSymbol) {
    playerSymbol = "X"; // First player to move becomes X
    multiplayerStatus.textContent = "You moved first as X!";
  } else if (!playerSymbol) {
    playerSymbol = "O"; // Second player becomes O
    multiplayerStatus.textContent = "You are O. Wait for X's move.";
    return; // Prevent O from moving until X has made the first move
  }

  // Enforce turn-based logic
  const expectedSymbol = isXNext ? "X" : "O";
  if (playerSymbol !== expectedSymbol) {
    statusDisplay.textContent = `Wait! ${expectedSymbol}'s turn.`;
    return;
  }

  // Update board and toggle turn
  board[index] = playerSymbol;
  isXNext = !isXNext;
  statusDisplay.textContent = `${isXNext ? "X" : "O"}'s Turn (You are ${playerSymbol})`;
  updateBoard();
  playSound(clickSound);

  // Send move to opponent
  if (conn && conn.open) {
    conn.send({ type: "move", board: [...board] });
    processMoveQueue();
  } else {
    moveQueue.push({ type: "move", board: [...board] });
    multiplayerStatus.textContent = "Buffering Move...";
  }

  checkGameEnd();
}

// Handle move in local/AI mode
function handleLocalMove(index) {
  const currentSymbol = isXNext ? "X" : "O";
  board[index] = currentSymbol;
  updateBoard();
  playSound(clickSound);

  if (checkWin(currentSymbol)) {
    showWin(`${currentSymbol} Dominates!`);
    gameActive = false;
    playSound(winSound);
    scheduleAutoReset();
    return;
  }

  if (board.every(cell => cell)) {
    showWin("Gridlock!");
    gameActive = false;
    scheduleAutoReset();
    return;
  }

  isXNext = !isXNext;
  statusDisplay.textContent = `${isXNext ? "X" : "O"} Activates...`;

  if (isAIMode && !isXNext) {
    setTimeout(makeAIMove, 500);
  }
}

// Schedule automatic board reset
function scheduleAutoReset() {
  if (gameEndTimeout) {
    clearTimeout(gameEndTimeout);
  }

  gameEndTimeout = setTimeout(() => {
    clearGrid();
    if (isOnlineMode && conn && conn.open) {
      conn.send({ type: "clear", board: Array(9).fill(null) });
    }
  }, 2000);
}

// AI Move
function makeAIMove() {
  if (!gameActive || isPaused) return;

  const emptyCells = [...cells].filter((_, i) => !board[i]);
  if (emptyCells.length > 0) {
    let chosenCell;

    switch (aiDifficulty) {
      case "pro":
        chosenCell = getBestMove(emptyCells, "O", true);
        break;
      case "amateur":
        chosenCell = getBestMove(emptyCells, "O", false);
        break;
      case "beginner":
      default:
        chosenCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        break;
    }

    chosenCell.click();
  }
}

function getBestMove(emptyCells, player, isPro = false) {
  if (isPro) {
    let bestMove, bestScore = -Infinity;
    emptyCells.forEach(cell => {
      const index = [...cells].indexOf(cell);
      board[index] = player;
      const score = minimax(board, 0, false);
      board[index] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = cell;
      }
    });
    return bestMove;
  } else {
    for (let combination of winningCombinations) {
      const [a, b, c] = combination;

      if (board[a] === "O" && board[b] === "O" && !board[c] && emptyCells.includes(cells[c]))
        return cells[c];
      if (board[a] === "O" && !board[b] && board[c] === "O" && emptyCells.includes(cells[b]))
        return cells[b];
      if (!board[a] && board[b] === "O" && board[c] === "O" && emptyCells.includes(cells[a]))
        return cells[a];

      if (board[a] === "X" && board[b] === "X" && !board[c] && emptyCells.includes(cells[c]))
        return cells[c];
      if (board[a] === "X" && !board[b] && board[c] === "X" && emptyCells.includes(cells[b]))
        return cells[b];
      if (!board[a] && board[b] === "X" && board[c] === "X" && emptyCells.includes(cells[a]))
        return cells[a];
    }

    if (board[4] === null && emptyCells.includes(cells[4])) {
      return cells[4];
    }

    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }
}

function minimax(board, depth, isMaximizing) {
  if (checkWin("O")) return 10 - depth;
  if (checkWin("X")) return depth - 10;
  if (board.every(cell => cell)) return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    board.forEach((cell, i) => {
      if (!cell) {
        board[i] = "O";
        const score = minimax(board, depth + 1, false);
        board[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    });
    return bestScore;
  } else {
    let bestScore = Infinity;
    board.forEach((cell, i) => {
      if (!cell) {
        board[i] = "X";
        const score = minimax(board, depth + 1, true);
        board[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    });
    return bestScore;
  }
}

// Check Win
function checkWin(symbol) {
  return winningCombinations.some(combination =>
    combination.every(index => board[index] === symbol)
  );
}

// Check Game End
function checkGameEnd() {
  const xCount = board.filter(cell => cell === "X").length;
  const oCount = board.filter(cell => cell === "O").length;
  const lastPlayer = xCount > oCount ? "X" : "O";

  if (checkWin(lastPlayer)) {
    if (isOnlineMode && conn && conn.open) {
      conn.send({ type: "gameOver", message: `${lastPlayer} Dominates!` });
    }
    showWin(`${lastPlayer} Dominates!`);
    gameActive = false;
    playSound(winSound);
    scheduleAutoReset();
  } else if (board.every(cell => cell)) {
    if (isOnlineMode && conn && conn.open) {
      conn.send({ type: "gameOver", message: "Gridlock!" });
    }
    showWin("Gridlock!");
    gameActive = false;
    scheduleAutoReset();
  }
}

// Show Win/Draw Overlay
function showWin(message) {
  const existingOverlay = document.querySelector(".win-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const overlay = document.createElement("div");
  overlay.classList.add("win-overlay");
  const text = document.createElement("div");
  text.classList.add("win-text");
  text.textContent = message;
  overlay.appendChild(text);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.classList.add("active"), 10);
  setTimeout(() => overlay.remove(), 2000);
}

// Clear Grid
function clearGrid() {
  if (gameEndTimeout) {
    clearTimeout(gameEndTimeout);
    gameEndTimeout = null;
  }

  gameActive = true;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  board = Array(9).fill(null);
  updateBoard();

  if (isOnlineMode) {
    isXNext = true;
    statusDisplay.textContent = `Awaiting First Move...${playerSymbol ? ` (You are ${playerSymbol})` : ""}`;
  } else {
    isXNext = true;
    statusDisplay.textContent = "X Activates...";
  }

  playSound(clickSound);
}

// Restart Game
function restartGame() {
  if (gameEndTimeout) {
    clearTimeout(gameEndTimeout);
    gameEndTimeout = null;
  }

  gameActive = true;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  board = Array(9).fill(null);
  updateBoard();
  moveQueue = [];

  if (isOnlineMode && peer) {
    chatMessages.innerHTML = "";
    chatContent.classList.remove("active");
    toggleChatBtn.textContent = "Open Comm";
    multiplayerStatus.textContent = "Resetting...";
    if (peer.id) {
      generatedCodeDisplay.textContent = `Your Code: ${peer.id}`;
    }
    pinInput.value = "";
    multiplayerStatus.textContent = "Waiting for opponent...";
    if (conn && conn.open) {
      conn.send({ type: "sync", board });
    }
    statusDisplay.textContent = "Awaiting First Move...";
  } else {
    isXNext = true;
    multiplayerStatus.textContent = "";
    generatedCodeDisplay.textContent = "";
    statusDisplay.textContent = "X Activates...";
  }

  playSound(clickSound);
}

// Sync Board
function syncBoard() {
  if (conn && conn.open && Date.now() - lastSyncTime > 500) {
    conn.send({ type: "sync", board: [...board] });
    lastSyncTime = Date.now();
  }
}

// Update Board
function updateBoard() {
  cells.forEach((cell, index) => {
    cell.textContent = board[index] || "";
    cell.classList.remove("X", "O");
    if (board[index]) {
      cell.classList.add(board[index]);
      cell.style.color = board[index] === "X" ? colorX : colorO;
    }
  });
}

// Pause Game
pauseBtn.addEventListener("click", () => {
  if (!gameActive) return;

  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
  statusDisplay.textContent = isPaused ? "System Paused" :
    isOnlineMode ? `${isXNext ? "X" : "O"}'s Turn${playerSymbol ? ` (You are ${playerSymbol})` : ""}` :
    `${isXNext ? "X" : "O"} Activates...`;
  playSound(clickSound);
});

// Quit Game
quitBtn.addEventListener("click", () => {
  if (confirm("Exit the Grid?")) {
    if (peer) peer.destroy();
    window.close();
  }
});

// Apply Colors
applyColorsBtn.addEventListener("click", () => {
  colorX = colorXInput.value;
  colorO = colorOInput.value;
  updateBoard();
  playSound(clickSound);
});

// Toggle Chat
toggleChatBtn.addEventListener("click", () => {
  chatContent.classList.toggle("active");
  toggleChatBtn.textContent = chatContent.classList.contains("active") ? "Close Comm" : "Open Comm";
  playSound(clickSound);
});

// Chat
sendChatBtn.addEventListener("click", sendChatMessage);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendChatMessage();
});

function sendChatMessage() {
  const message = chatInput.value.trim();
  if (message && isOnlineMode && conn && conn.open) {
    const fullMessage = `${playerSymbol || '?'}: ${message}`;
    conn.send({ type: "chat", message: fullMessage });
    displayChatMessage(fullMessage);
    chatInput.value = "";
    playSound(clickSound);
  }
}

function displayChatMessage(message) {
  const msgDiv = document.createElement("div");
  msgDiv.textContent = message;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Cell Events
cells.forEach(cell => {
  cell.addEventListener("click", drawSymbol);
  cell.addEventListener("touchstart", (e) => {
    e.preventDefault();
    drawSymbol(e);
  }, { passive: false });
});

// Restart button event
restartBtn.addEventListener("click", restartGame);

// Initialize game UI
statusDisplay.textContent = "X Activates...";

// Handle window before unload
window.addEventListener('beforeunload', () => {
  if (peer) peer.destroy();
});

// Display error message if PeerJS is not available
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Peer !== 'function' && isOnlineMode) {
    multiplayerStatus.textContent = "Warning: PeerJS not detected.";
  }
});
