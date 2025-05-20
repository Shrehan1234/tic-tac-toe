// Game related functionality
let socket;
let currentGame = null;

// DOM Elements
const createGameBtn = document.getElementById('create-game-btn');
const joinGameBtn = document.getElementById('join-game-btn');
const myGamesBtn = document.getElementById('my-games-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const availableGames = document.getElementById('available-games');
const myGames = document.getElementById('my-games');
const leaderboard = document.getElementById('leaderboard');
const gamesContainer = document.getElementById('games-container');
const myGamesContainer = document.getElementById('my-games-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const gameSection = document.getElementById('game-section');
const gameBoard = document.getElementById('game-board');
const gameInfo = document.getElementById('game-info');
const gameId = document.getElementById('game-id');
const player1Name = document.getElementById('player1-name');
const player2Name = document.getElementById('player2-name');
const backToDashboardBtn = document.getElementById('back-to-dashboard');

// Initialize socket connection
function initSocket() {
    if (socket) {
        socket.disconnect();
    }
    
    // Connect to socket server
    socket = io();
    
    // Authenticate socket connection
    const token = getAuthToken();
    if (token) {
        socket.emit('authenticate', token);
    }
    
    // Socket event listeners
    socket.on('gameUpdate', handleGameUpdate);
    socket.on('gameError', handleGameError);
    socket.on('availableGames', displayAvailableGames);
}

// Create a new game
createGameBtn.addEventListener('click', async () => {
    try {
        const token = getAuthToken();
        
        const response = await fetch(`${API_URL}/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to create game');
        }
        
        // Join the newly created game
        socket.emit('joinGame', { gameId: data.game.id });
        
    } catch (error) {
        console.error('Create game error:', error);
        alert('Failed to create game: ' + error.message);
    }
});

// Join game button - Show available games
joinGameBtn.addEventListener('click', () => {
    hideAllDashboardSections();
    availableGames.classList.remove('hidden');
    socket.emit('getAvailableGames');
});

// My games button
myGamesBtn.addEventListener('click', async () => {
    hideAllDashboardSections();
    myGames.classList.remove('hidden');
    await fetchMyGames();
});

// Leaderboard button
leaderboardBtn.addEventListener('click', async () => {
    hideAllDashboardSections();
    leaderboard.classList.remove('hidden');
    await fetchLeaderboard();
});

// Back to dashboard button
backToDashboardBtn.addEventListener('click', () => {
    gameSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    currentGame = null;
});

// Handle click on game board
gameBoard.addEventListener('click', (e) => {
    const box = e.target.closest('.box');
    if (!box || !currentGame) return;
    
    const index = box.dataset.index;
    
    // Make move
    socket.emit('makeMove', {
        gameId: currentGame.gameId,
        index: parseInt(index)
    });
});

// Fetch my games
async function fetchMyGames() {
    try {
        const token = getAuthToken();
        
        const response = await fetch(`${API_URL}/games/my-games`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch games');
        }
        
        displayMyGames(data.games);
        
    } catch (error) {
        console.error('Fetch my games error:', error);
        myGamesContainer.innerHTML = '<p>Failed to load games</p>';
    }
}

// Fetch leaderboard
async function fetchLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/games/leaderboard`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch leaderboard');
        }
        
        displayLeaderboard(data.leaderboard);
        
    } catch (error) {
        console.error('Fetch leaderboard error:', error);
        leaderboardContainer.innerHTML = '<p>Failed to load leaderboard</p>';
    }
}

// Display available games
function displayAvailableGames(games) {
    gamesContainer.innerHTML = '';
    
    if (games.length === 0) {
        gamesContainer.innerHTML = '<p>No games available. Create a new game!</p>';
        return;
    }
    
    games.forEach(game => {
        const gameItem = document.createElement('div');
        gameItem.className = 'game-item';
        
        gameItem.innerHTML = `
            <div>
                <p>Game #${game._id}</p>
                <p>Created by: ${game.player1.username}</p>
            </div>
            <button class="btn join-game-btn" data-id="${game._id}">Join Game</button>
        `;
        
        gameItem.querySelector('.join-game-btn').addEventListener('click', () => {
            socket.emit('joinGame', { gameId: game._id });
        });
        
        gamesContainer.appendChild(gameItem);
    });
}

// Display my games
function displayMyGames(games) {
    myGamesContainer.innerHTML = '';
    
    if (games.length === 0) {
        myGamesContainer.innerHTML = '<p>You have no active games. Create or join a game!</p>';
        return;
    }
    
    games.forEach(game => {
        const gameItem = document.createElement('div');
        gameItem.className = 'game-item';
        
        const opponent = game.player1.username === getUserData().username ? 
            (game.player2 ? game.player2.username : 'Waiting for opponent') : 
            game.player1.username;
        
        let status;
        if (game.status === 'completed') {
            if (game.winner) {
                status = game.winner.username === getUserData().username ? 
                    'You won!' : `${game.winner.username} won`;
            } else {
                status = 'Draw';
            }
        } else {
            status = game.currentPlayer === getUserData().id ? 
                'Your turn' : `${opponent}'s turn`;
        }
        
        gameItem.innerHTML = `
            <div>
                <p>Game #${game._id}</p>
                <p>Opponent: ${opponent}</p>
                <p>Status: ${status}</p>
            </div>
            <button class="btn resume-game-btn" data-id="${game._id}">Resume Game</button>
        `;
        
        gameItem.querySelector('.resume-game-btn').addEventListener('click', () => {
            socket.emit('joinGame', { gameId: game._id });
        });
        
        myGamesContainer.appendChild(gameItem);
    });
}

// Display leaderboard
function displayLeaderboard(leaderboardData) {
    leaderboardContainer.innerHTML = '';
    
    if (leaderboardData.length === 0) {
        leaderboardContainer.innerHTML = '<p>No players on the leaderboard yet!</p>';
        return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'leaderboard-table';
    
    // Create header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Draws</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    leaderboardData.forEach((user, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.username}</td>
            <td>${user.stats.wins}</td>
            <td>${user.stats.losses}</td>
            <td>${user.stats.draws}</td>
        `;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    leaderboardContainer.appendChild(table);
}

// Handle game update from server
function handleGameUpdate(game) {
    currentGame = game;
    
    // Show game section and hide dashboard
    dashboard.classList.add('hidden');
    gameSection.classList.remove('hidden');
    
    // Update game info
    gameId.textContent = game.gameId;
    
    // Get player names
    fetchPlayerNames(game.player1, game.player2);
    
    // Update game status
    updateGameStatus(game);
    
    // Update board
    updateGameBoard(game.board);
}

// Fetch player names
async function fetchPlayerNames(player1Id, player2Id) {
    try {
        // For player 1
        const response1 = await fetch(`${API_URL}/games/${player1Id}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        const data1 = await response1.json();
        player1Name.textContent = data1.game.player1.username;
        
        // For player 2 (if exists)
        if (player2Id) {
            const response2 = await fetch(`${API_URL}/games/${player2Id}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });
            const data2 = await response2.json();
            player2Name.textContent = data2.game.player1.username;
        } else {
            player2Name.textContent = 'Waiting for opponent';
        }
    } catch (error) {
        console.error('Fetch player names error:', error);
        player1Name.textContent = 'Player 1';
        player2Name.textContent = 'Player 2';
    }
}

// Update game status
function updateGameStatus(game) {
    const userData = getUserData();
    
    if (game.status === 'waiting') {
        gameInfo.textContent = 'Waiting for opponent to join...';
    } else if (game.status === 'completed') {
        if (game.winner) {
            const isWinner = game.winner === userData.id;
            gameInfo.textContent = isWinner ? 'You won!' : 'You lost!';
        } else {
            gameInfo.textContent = 'Game ended in a draw!';
        }
    } else {
        const isYourTurn = game.currentPlayer === userData.id;
        gameInfo.textContent = isYourTurn ? 'Your turn' : 'Opponent\'s turn';
    }
}

// Update game board
function updateGameBoard(board) {
    const boxes = gameBoard.querySelectorAll('.box');
    
    boxes.forEach((box, index) => {
        box.innerText = board[index];
        box.classList.remove('win');
        
        // Disable click if box is already filled
        if (board[index]) {
            box.style.pointerEvents = 'none';
        } else {
            // Enable click only if it's user's turn
            const isUserTurn = currentGame.currentPlayer === getUserData().id;
            box.style.pointerEvents = isUserTurn ? 'auto' : 'none';
        }
    });
    
    // Highlight winning combination if game is completed
    if (currentGame.status === 'completed' && currentGame.winner) {
        highlightWinningCombination(board);
    }
}

// Highlight winning combination
function highlightWinningCombination(board) {
    const winningCombos = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    
    const boxes = gameBoard.querySelectorAll('.box');
    
    for (const combo of winningCombos) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            boxes[a].classList.add('win');
            boxes[b].classList.add('win');
            boxes[c].classList.add('win');
            break;
        }
    }
}

// Handle game error
function handleGameError(error) {
    console.error('Game error:', error);
    alert(`Game error: ${error.message}`);
}

// Hide all dashboard sections
function hideAllDashboardSections() {
    availableGames.classList.add('hidden');
    myGames.classList.add('hidden');
    leaderboard.classList.add('hidden');
}

// Initialize game functionality
function initGame() {
    // Initialize socket when user is logged in
    if (getUserData()) {
        initSocket();
    }
}