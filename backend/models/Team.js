const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    minlength: 2,
    maxlength: 60
  },
  shortName: {
    type: String,
    trim: true,
    maxlength: 10,
    uppercase: true,
    default: ''
  },
  logo: {
    type: String,
    default: null
  },
  city: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
