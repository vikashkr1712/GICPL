const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidation
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
];

const validateTeam = [
  body('name').trim().notEmpty().withMessage('Team name is required'),
  handleValidation
];

const validatePlayer = [
  body('name').trim().notEmpty().withMessage('Player name is required'),
  handleValidation
];

const validateMatch = [
  body('teamA').notEmpty().withMessage('Team A is required').isMongoId(),
  body('teamB').notEmpty().withMessage('Team B is required').isMongoId(),
  body('totalOvers').isInt({ min: 1, max: 50 }).withMessage('Total overs must be between 1 and 50'),
  handleValidation
];

const validateBooking = [
  body('groundName').trim().notEmpty().withMessage('Ground name is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be HH:MM'),
  body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be HH:MM'),
  handleValidation
];

module.exports = {
  validateRegister,
  validateLogin,
  validateTeam,
  validatePlayer,
  validateMatch,
  validateBooking
};
