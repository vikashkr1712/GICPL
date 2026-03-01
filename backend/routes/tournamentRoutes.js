const express = require('express');
const router = express.Router();
const {
  createTournament, getTournaments, getTournamentById, addTeam, updatePointsTable,
  updateStatus, removeTeam, deleteTournament
} = require('../controllers/tournamentController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.post('/', authenticate, authorize(['admin']), createTournament);
router.get('/', getTournaments);
router.get('/:id', getTournamentById);
router.put('/:id/add-team', authenticate, authorize(['admin']), addTeam);
router.put('/:id/remove-team', authenticate, authorize(['admin']), removeTeam);
router.put('/:id/status', authenticate, authorize(['admin']), updateStatus);
router.put('/:id/update-points', authenticate, authorize(['admin']), updatePointsTable);
router.delete('/:id', authenticate, authorize(['admin']), deleteTournament);

module.exports = router;
