const mongoose = require('mongoose');

const ballSchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
    index: true           // indexed for fast retrieval
  },
  innings: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Innings',
    required: true,
    index: true
  },
  inningsNumber: { type: Number, required: true },
  over:          { type: Number, required: true },
  ballNumber:    { type: Number, required: true }, // 1–6 (legal deliveries)

  batsman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  bowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },

  runs: {
    type: Number,
    default: 0,
    min: 0,
    max: 6
  },
  extraRuns: {
    type: Number,
    default: 0
  },
  extraType: {
    type: String,
    enum: ['none', 'wide', 'no-ball', 'bye', 'leg-bye'],
    default: 'none'
  },

  wicket: {
    type: Boolean,
    default: false
  },
  wicketType: {
    type: String,
    enum: ['', 'bowled', 'caught', 'lbw', 'run-out', 'stumped', 'hit-wicket', 'obstructing-field'],
    default: ''
  },
  playerOut: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },

  // Snapshot of innings score after this ball (for undo recalculation)
  scoreSnapshot: {
    totalRuns:    Number,
    totalWickets: Number,
    overs:        Number,
    balls:        Number
  },

  // Auto-generated commentary text
  commentary: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Compound index for fast per-match per-innings queries
ballSchema.index({ match: 1, inningsNumber: 1 });

module.exports = mongoose.model('Ball', ballSchema);
