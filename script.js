const boardElement = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusElement = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

let board = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;
let currentPlayer = 'X'; // Player is always X, AI is O

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

    if (board[index] !== '' || !gameActive || currentPlayer !== 'X') return;

    // Player Move
    makeMove(index, 'X');

    // Check game state
    let winner = checkWinner(board);
    if (winner) {
        endGame(winner);
        return;
    }

    // AI Move
    currentPlayer = 'O';
    statusElement.innerText = "AI is thinking...";

    try {
        const aiMoveIndex = await getAIMoveFromBackend(board);

        // Add a small artificial delay for realism if it's too fast
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
    // Convert board to string typically, but let's send JSON
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

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
resetBtn.addEventListener('click', resetGame);
