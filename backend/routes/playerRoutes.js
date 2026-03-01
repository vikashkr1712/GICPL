const express = require('express');
const router = express.Router();
const { createPlayer, getPlayers, getPlayerById, updatePlayer, deletePlayer } = require('../controllers/playerController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validatePlayer } = require('../middleware/validate');

router.post('/', authenticate, authorize(['admin']), validatePlayer, createPlayer);
router.get('/', getPlayers);
router.get('/:id', getPlayerById);
router.put('/:id', authenticate, authorize(['admin']), updatePlayer);
router.delete('/:id', authenticate, authorize(['admin']), deletePlayer);

module.exports = router;
