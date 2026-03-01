const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groundName: {
    type: String,
    required: [true, 'Ground name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)']
  },
  purpose: {
    type: String,
    enum: ['practice', 'match', 'net-session', 'other'],
    default: 'practice'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: 200,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
