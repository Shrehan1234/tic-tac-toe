// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Game = require('./models/Game');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // In production, replace with your specific domain
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tic-tac-toe')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Game routes
const gameRoutes = require('./routes/game');
app.use('/api/games', gameRoutes);

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io connection
const activeGames = {};
const userSockets = {};

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  // Authenticate socket
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      userSockets[decoded.id] = socket.id;
      console.log(`User ${decoded.id} authenticated on socket ${socket.id}`);
    } catch (error) {
      console.error('Socket authentication error:', error);
    }
  });

  // Create or join game
  socket.on('joinGame', async ({ gameId }) => {
    try {
      let game;
      
      if (gameId) {
        // Join existing game
        game = await Game.findById(gameId);
        if (!game) {
          socket.emit('gameError', { message: 'Game not found' });
          return;
        }
        
        if (game.player2 && game.player2 !== socket.userId && game.player1 !== socket.userId) {
          socket.emit('gameError', { message: 'Game is full' });
          return;
        }
        
        if (!game.player2 && game.player1 !== socket.userId) {
          game.player2 = socket.userId;
          game.status = 'active';
          await game.save();
        }
      } else {
        // Create new game
        game = new Game({
          player1: socket.userId,
          board: ['', '', '', '', '', '', '', '', ''],
          currentPlayer: socket.userId,
          status: 'waiting'
        });
        await game.save();
      }
      
      socket.join(game._id.toString());
      
      if (!activeGames[game._id.toString()]) {
        activeGames[game._id.toString()] = {
          gameData: game,
          players: {}
        };
      }
      
      activeGames[game._id.toString()].players[socket.userId] = socket.id;
      
      // Notify all players in the game
      io.to(game._id.toString()).emit('gameUpdate', {
        gameId: game._id,
        board: game.board,
        currentPlayer: game.currentPlayer,
        status: game.status,
        player1: game.player1,
        player2: game.player2,
        winner: game.winner
      });
      
    } catch (error) {
      console.error('Join game error:', error);
      socket.emit('gameError', { message: 'Failed to join game' });
    }
  });

  // Handle moves
  socket.on('makeMove', async ({ gameId, index }) => {
    try {
      const game = await Game.findById(gameId);
      
      if (!game) {
        socket.emit('gameError', { message: 'Game not found' });
        return;
      }
      
      if (game.status !== 'active') {
        socket.emit('gameError', { message: 'Game is not active' });
        return;
      }
      
      if (game.currentPlayer !== socket.userId) {
        socket.emit('gameError', { message: 'Not your turn' });
        return;
      }
      
      if (game.board[index] !== '') {
        socket.emit('gameError', { message: 'Invalid move' });
        return;
      }
      
      // Determine X or O
      const symbol = game.player1 === socket.userId ? 'X' : 'O';
      
      // Update board
      game.board[index] = symbol;
      
      // Check for winner
      const winner = checkWinner(game.board);
      if (winner) {
        game.status = 'completed';
        game.winner = socket.userId;
      } else if (!game.board.includes('')) {
        game.status = 'completed';
        game.winner = null; // Draw
      } else {
        // Switch turns
        game.currentPlayer = game.currentPlayer === game.player1 ? game.player2 : game.player1;
      }
      
      await game.save();
      
      // Update all clients
      io.to(gameId).emit('gameUpdate', {
        gameId: game._id,
        board: game.board,
        currentPlayer: game.currentPlayer,
        status: game.status,
        player1: game.player1,
        player2: game.player2,
        winner: game.winner
      });
      
    } catch (error) {
      console.error('Make move error:', error);
      socket.emit('gameError', { message: 'Failed to make move' });
    }
  });

  // Get available games
  socket.on('getAvailableGames', async () => {
    try {
      const games = await Game.find({ status: 'waiting' }).limit(10);
      socket.emit('availableGames', games);
    } catch (error) {
      console.error('Get available games error:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    if (socket.userId) {
      delete userSockets[socket.userId];
    }
  });
});

// Check for winner
function checkWinner(board) {
  const winningCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  for (const combo of winningCombos) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});