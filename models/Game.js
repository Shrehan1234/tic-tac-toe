// models/Game.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GameSchema = new Schema({
  player1: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  player2: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  board: {
    type: [String],
    default: ['', '', '', '', '', '', '', '', '']
  },
  currentPlayer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed'],
    default: 'waiting'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the 'updatedAt' field on save
GameSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Game', GameSchema);