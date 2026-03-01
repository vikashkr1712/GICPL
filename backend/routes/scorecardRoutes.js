const express = require('express');
const router = express.Router();
const { getScorecard, getBalls } = require('../controllers/scorecardController');

router.get('/:matchId', getScorecard);
router.get('/:matchId/balls', getBalls);

module.exports = router;
