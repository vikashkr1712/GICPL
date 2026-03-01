const express = require('express');
const router = express.Router();
const {
  getBattingLeaderboard, getBowlingLeaderboard, getSixesLeaderboard
} = require('../controllers/leaderboardController');

router.get('/batting', getBattingLeaderboard);
router.get('/bowling', getBowlingLeaderboard);
router.get('/sixes', getSixesLeaderboard);

module.exports = router;
