const express = require('express');
const { getLockersByClientId, getClientIdFromLocker , getLockerStatuses } = require('../controllers/lockerController');
const router = express.Router();

router.get('/getLockerDoors/:client_id', getLockersByClientId);
router.get('/client-from-locker/:locker_id', getClientIdFromLocker);
router.get('/locker-status/:client_id', getLockerStatuses); 

module.exports = router;
