const Booking = require('../models/Booking');

// @POST /api/bookings
exports.createBooking = async (req, res, next) => {
  try {
    const { groundName, date, startTime, endTime, purpose, notes } = req.body;

    // Double-booking prevention logic
    const startH = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endH   = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

    if (endH <= startH) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(bookingDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const conflict = await Booking.findOne({
      groundName,
      date: { $gte: bookingDate, $lt: nextDay },
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Ground "${groundName}" is already booked from ${conflict.startTime} to ${conflict.endTime}`
      });
    }

    const booking = await Booking.create({
      user: req.user._id,
      groundName, date, startTime, endTime, purpose, notes
    });

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @GET /api/bookings
exports.getBookings = async (req, res, next) => {
  try {
    const filter = {};
    // Players see their own bookings; admins see all
    if (req.user.role === 'player') filter.user = req.user._id;
    if (req.query.groundName) filter.groundName = req.query.groundName;
    if (req.query.status) filter.status = req.query.status;

    const bookings = await Booking.find(filter)
      .populate('user', 'name email')
      .sort({ date: 1 })
      .lean();
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/bookings/:id/approve  (admin only)
exports.approveBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/bookings/:id/cancel
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Only owner or admin can cancel
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    booking.status = 'cancelled';
    await booking.save();
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @DELETE /api/bookings/:id  (admin only)
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, message: 'Booking deleted' });
  } catch (err) {
    next(err);
  }
};
