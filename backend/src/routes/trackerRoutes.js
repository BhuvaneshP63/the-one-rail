const express = require('express');
const router = express.Router();
const { getLiveStatus } = require('../controllers/trackerController');

router.get('/:trainId/status', getLiveStatus);

module.exports = router;
