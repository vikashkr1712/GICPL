const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const { validateRegister, validateLogin } = require('../middleware/validate');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', authenticate, getMe);

module.exports = router;
