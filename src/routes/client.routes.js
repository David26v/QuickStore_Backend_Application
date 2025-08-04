
const express = require('express');
const { getClientAuthMethods } = require('../controllers/clientController');

const router = express.Router();

router.get('/get_client_methods/:client_id', getClientAuthMethods);

module.exports = router;
