// routes/game.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User')
const Game = require('../models/Game');

// Middleware to authenticate user
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.userId = decoded.id;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Create a new game
router.post('/', auth, async (req, res) => {
  try {
    const game = new Game({
      player1: req.userId,
      currentPlayer: req.userId,
      status: 'waiting'
    });

    await game.save();

    res.status(201).json({
      message: 'Game created',
      game: {
        id: game._id,
        status: game.status
      }
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available games
router.get('/available', auth, async (req, res) => {
  try {
    const games = await Game.find({ status: 'waiting' })
      .populate('player1', 'username')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ games });
  } catch (error) {
    console.error('Get available games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's games
router.get('/my-games', auth, async (req, res) => {
  try {
    const games = await Game.find({
      $or: [{ player1: req.userId }, { player2: req.userId }],
      status: { $in: ['active', 'completed'] }
    })
      .populate('player1', 'username')
      .populate('player2', 'username')
      .populate('winner', 'username')
      .sort({ updatedAt: -1 });

    res.status(200).json({ games });
  } catch (error) {
    console.error('Get my games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific game
router.get('/:id', auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('player1', 'username')
      .populate('player2', 'username')
      .populate('currentPlayer', 'username')
      .populate('winner', 'username');

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    res.status(200).json({ game });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a game
router.post('/:id/join', auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Game is not available to join' });
    }

    if (game.player1.toString() === req.userId) {
      return res.status(400).json({ message: 'You cannot join your own game' });
    }

    game.player2 = req.userId;
    game.status = 'active';
    await game.save();

    res.status(200).json({
      message: 'Game joined successfully',
      gameId: game._id
    });
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ 'stats.wins': -1 })
      .limit(10)
      .select('username stats');

    res.status(200).json({ leaderboard: users });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;