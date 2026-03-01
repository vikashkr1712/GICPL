const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true,
    minlength: 2,
    maxlength: 60
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  battingStyle: {
    type: String,
    enum: ['right-hand', 'left-hand', ''],
    default: ''
  },
  bowlingStyle: {
    type: String,
    enum: ['fast', 'medium-fast', 'medium', 'spin', 'none', ''],
    default: ''
  },
  role: {
    type: String,
    enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper', ''],
    default: ''
  },
  profileImage: {
    type: String,
    default: null
  },
  careerStats: {
    matches:       { type: Number, default: 0 },
    runs:          { type: Number, default: 0 },
    ballsFaced:    { type: Number, default: 0 },
    fours:         { type: Number, default: 0 },
    sixes:         { type: Number, default: 0 },
    highestScore:  { type: Number, default: 0 },
    notOuts:       { type: Number, default: 0 },
    wickets:       { type: Number, default: 0 },
    ballsBowled:   { type: Number, default: 0 },
    runsConceded:  { type: Number, default: 0 },
    fifers:        { type: Number, default: 0 }
  }
}, { timestamps: true });

// Virtual: Career batting average
playerSchema.virtual('battingAverage').get(function () {
  const outs = this.careerStats.matches - this.careerStats.notOuts;
  if (outs === 0) return this.careerStats.runs;
  return (this.careerStats.runs / outs).toFixed(2);
});

// Virtual: Career bowling economy
playerSchema.virtual('economy').get(function () {
  const overs = this.careerStats.ballsBowled / 6;
  if (overs === 0) return 0;
  return (this.careerStats.runsConceded / overs).toFixed(2);
});

playerSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Player', playerSchema);
