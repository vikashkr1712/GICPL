const express = require('express');
const router = express.Router();
const {
  addBall, undoBall, changeBatsman, changeBowler, setOpeningPlayers, endInnings, setPlayerOfMatch
} = require('../controllers/scoringController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// All scoring routes require authentication and admin/scorer role
router.post('/:matchId/add-ball',    authenticate, authorize(['admin', 'scorer']), addBall);
router.post('/:matchId/undo',        authenticate, authorize(['admin', 'scorer']), undoBall);
router.post('/:matchId/end-innings', authenticate, authorize(['admin', 'scorer']), endInnings);
router.put('/:matchId/change-batsman',     authenticate, authorize(['admin', 'scorer']), changeBatsman);
router.put('/:matchId/change-bowler',      authenticate, authorize(['admin', 'scorer']), changeBowler);
router.put('/:matchId/set-players',        authenticate, authorize(['admin', 'scorer']), setOpeningPlayers);
router.put('/:matchId/player-of-match',    authenticate, authorize(['admin', 'scorer']), setPlayerOfMatch);

module.exports = router;
