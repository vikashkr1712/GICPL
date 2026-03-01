const User = require('../models/User');

// @GET /api/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').lean();
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/users/:id/role  (admin only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowed = ['admin', 'scorer', 'player'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/users/profile  (self update)
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, city, profileImage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, city, profileImage },
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
