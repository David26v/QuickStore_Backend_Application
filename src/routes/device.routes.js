    const express = require('express');
    const router = express.Router();
    const { registerDevice, getDeviceInfo } = require('../controllers/deviceController');

    router.post('/register-device', registerDevice);
    router.get('/getDeviceInfo' ,getDeviceInfo);

    module.exports = router;
