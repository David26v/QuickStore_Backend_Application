const express = require('express');
const router = express.Router();
const { registerDevice } = require('../controllers/deviceController');

router.post('/register-device', registerDevice);

module.exports = router;
