const express = require('express');
const { getLockersByClientId, getClientIdFromLocker } = require('../controllers/lockerController');
const router = express.Router();

router.get('/getLockerDoors/:client_id', getLockersByClientId);
router.get('/client-from-locker/:locker_id', getClientIdFromLocker);

module.exports = router;
