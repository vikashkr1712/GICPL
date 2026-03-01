const mongoose = require('mongoose');

const inningsSchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  inningsNumber: {
    type: Number,
    enum: [1, 2],
    required: true
  },
  battingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  bowlingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  totalRuns:    { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  overs:        { type: Number, default: 0 },
  balls:        { type: Number, default: 0 }, // 0–5

  striker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  nonStriker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  currentBowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  // Per-batsman stats for this innings
  battingStats: [{
    player:     { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    runs:       { type: Number, default: 0 },
    balls:      { type: Number, default: 0 },
    fours:      { type: Number, default: 0 },
    sixes:      { type: Number, default: 0 },
    isOut:      { type: Boolean, default: false },
    dismissal:  { type: String, default: '' }
  }],
  // Per-bowler stats for this innings
  bowlingStats: [{
    player:        { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    overs:         { type: Number, default: 0 },
    balls:         { type: Number, default: 0 },
    runsConceded:  { type: Number, default: 0 },
    wickets:       { type: Number, default: 0 },
    wides:         { type: Number, default: 0 },
    noBalls:       { type: Number, default: 0 }
  }],
  // Current partnership tracking
  partnershipRuns:  { type: Number, default: 0 },
  partnershipBalls: { type: Number, default: 0 },

  // Extras breakdown
  extras: {
    wides:  { type: Number, default: 0 },
    noBalls:{ type: Number, default: 0 },
    byes:   { type: Number, default: 0 },
    legByes:{ type: Number, default: 0 },
    total:  { type: Number, default: 0 }
  },

  // Fall of wickets
  fallOfWickets: [{
    wicketNumber: Number,
    runs:         Number,
    overs:        String,
    player:       { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Innings', inningsSchema);
