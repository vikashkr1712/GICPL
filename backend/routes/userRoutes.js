const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, updateProfile } = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.get('/', authenticate, authorize(['admin']), getAllUsers);
router.put('/profile', authenticate, updateProfile);
router.put('/:id/role', authenticate, authorize(['admin']), updateUserRole);

module.exports = router;
