const express = require('express');
const router = express.Router();
const {
  createBooking, getBookings, approveBooking, cancelBooking, deleteBooking
} = require('../controllers/bookingController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validateBooking } = require('../middleware/validate');

router.post('/', authenticate, validateBooking, createBooking);
router.get('/', authenticate, getBookings);
router.put('/:id/approve', authenticate, authorize(['admin']), approveBooking);
router.put('/:id/cancel', authenticate, cancelBooking);
router.delete('/:id', authenticate, authorize(['admin']), deleteBooking);

module.exports = router;
