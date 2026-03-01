const express = require('express');
const router = express.Router();
const {
  createTeam, getTeams, getTeamById, updateTeam, deleteTeam,
  addPlayerToTeam, removePlayerFromTeam
} = require('../controllers/teamController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validateTeam } = require('../middleware/validate');

router.post('/', authenticate, validateTeam, createTeam);
router.get('/', getTeams);
router.get('/:id', getTeamById);
router.put('/:id', authenticate, authorize(['admin']), updateTeam);
router.delete('/:id', authenticate, authorize(['admin']), deleteTeam);
router.put('/:id/add-player', authenticate, authorize(['admin']), addPlayerToTeam);
router.put('/:id/remove-player', authenticate, authorize(['admin']), removePlayerFromTeam);

module.exports = router;
