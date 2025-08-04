const express = require('express');
const { getLockersByClientId } = require('../controllers/lockerController');
const router = express.Router();

router.get('/getLockerDoors/:client_id', getLockersByClientId);

module.exports = router;
