const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  playingXI_A: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  playingXI_B: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  totalOvers: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },
  venue: {
    type: String,
    trim: true,
    default: 'TBD'
  },
  matchType: {
    type: String,
    enum: ['T20', 'ODI', 'Test', 'T10', 'Other', 'Custom'],
    default: 'T20'
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed', 'abandoned'],
    default: 'upcoming'
  },
  currentInnings: {
    type: Number,
    default: 1
  },
  tossWinner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  tossDecision: {
    type: String,
    enum: ['bat', 'bowl', ''],
    default: ''
  },
  scorer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  resultDescription: {
    type: String,
    default: ''
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    default: null
  },
  matchDate: {
    type: Date,
    default: Date.now
  },
  // Target for 2nd innings (first innings total + 1)
  target: {
    type: Number,
    default: null
  },
  // Player of the match
  playerOfMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  // Optimistic locking to prevent concurrent scoring conflicts
  version: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
