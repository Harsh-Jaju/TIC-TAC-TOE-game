const boardElement = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusElement = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

// New Elements
const modeSelection = document.getElementById('modeSelection');
const gameContainer = document.getElementById('gameContainer');
const vsAiBtn = document.getElementById('vsAiBtn');
const twoPlayerBtn = document.getElementById('twoPlayerBtn');
const menuBtn = document.getElementById('menuBtn');

let board = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;
let currentPlayer = 'X'; 
let gameMode = 'AI'; // 'AI' or 'PVP'

const checkWinner = (currentBoard) => {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
            return currentBoard[a];
        }
    }
    return currentBoard.includes('') ? null : 'TIE';
};

const handleCellClick = async (e) => {
    const index = e.target.getAttribute('data-index');

    if (board[index] !== '' || !gameActive) return;
    
    // In AI mode, strictly enforce that player controls X only
    if (gameMode === 'AI' && currentPlayer !== 'X') return;

    // Player Move (or current turn in PVP)
    makeMove(index, currentPlayer);

    // Check game state
    let winner = checkWinner(board);
    if (winner) {
        endGame(winner);
        return;
    }

    if (gameMode === 'AI') {
        // AI Logic
        currentPlayer = 'O';
        statusElement.innerText = "AI is thinking...";

        try {
            const aiMoveIndex = await getAIMoveFromBackend(board);

            // Add a small artificial delay for realism
            setTimeout(() => {
                if (aiMoveIndex !== -1 && gameActive) {
                    makeMove(aiMoveIndex, 'O');
                    winner = checkWinner(board);
                    if (winner) {
                        endGame(winner);
                    } else {
                        currentPlayer = 'X';
                        statusElement.innerText = "Player X's Turn";
                    }
                }
            }, 500);

        } catch (error) {
            console.error("Error communicating with backend:", error);
            statusElement.innerText = "Error: Ensure C++ server is running!";
        }
    } else {
        // PVP Logic
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        statusElement.innerText = `Player ${currentPlayer}'s Turn`;
    }
};

const makeMove = (index, player) => {
    board[index] = player;
    const cell = cells[index];
    cell.classList.add(player.toLowerCase());
    cell.innerText = player;
};

const endGame = (winner) => {
    gameActive = false;
    if (winner === 'TIE') {
        statusElement.innerText = "It's a Tie!";
    } else {
        statusElement.innerText = `Player ${winner} Wins!`;
    }
};

const resetGame = () => {
    board = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    currentPlayer = 'X';
    cells.forEach(cell => {
        cell.className = 'cell';
        cell.innerText = '';
    });
    statusElement.innerText = "Player X's Turn";
};

const getAIMoveFromBackend = async (currentBoard) => {
    const response = await fetch('/api/move', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ board: currentBoard })
    });

    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    return data.move;
};

// Mode Selection Logic
const startGame = (mode) => {
    gameMode = mode;
    modeSelection.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    resetGame();
};

const showMenu = () => {
    gameContainer.classList.add('hidden');
    modeSelection.classList.remove('hidden');
    resetGame();
};

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
resetBtn.addEventListener('click', resetGame);
menuBtn.addEventListener('click', showMenu);
vsAiBtn.addEventListener('click', () => startGame('AI'));
twoPlayerBtn.addEventListener('click', () => startGame('PVP'));
