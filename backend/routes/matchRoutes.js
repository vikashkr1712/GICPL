const express = require('express');
const router = express.Router();
const {
  createMatch, getMatches, getMatchById, startMatch, endMatch, updateMatch, deleteMatch
} = require('../controllers/matchController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validateMatch } = require('../middleware/validate');

router.post('/', authenticate, authorize(['admin']), validateMatch, createMatch);
router.get('/', getMatches);
router.get('/:id', getMatchById);
router.put('/:id', authenticate, authorize(['admin']), updateMatch);
router.put('/:id/start', authenticate, authorize(['admin']), startMatch);
router.put('/:id/end', authenticate, authorize(['admin']), endMatch);
router.delete('/:id', authenticate, authorize(['admin']), deleteMatch);

module.exports = router;
