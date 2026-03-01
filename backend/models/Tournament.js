const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],
  format: {
    type: String,
    enum: ['league', 'knockout', 'league+knockout'],
    default: 'league'
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed'],
    default: 'upcoming'
  },
  startDate: { type: Date },
  endDate:   { type: Date },

  // Auto-calculated points table
  pointsTable: [{
    team:       { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    played:     { type: Number, default: 0 },
    won:        { type: Number, default: 0 },
    lost:       { type: Number, default: 0 },
    noResult:   { type: Number, default: 0 },
    points:     { type: Number, default: 0 },
    nrr:        { type: Number, default: 0 },      // Net Run Rate
    runsFor:    { type: Number, default: 0 },
    oversFor:   { type: Number, default: 0 },
    runsAgainst:{ type: Number, default: 0 },
    oversAgainst:{ type: Number, default: 0 }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);
