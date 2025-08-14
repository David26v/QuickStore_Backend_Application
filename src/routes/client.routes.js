
const express = require('express');
const { getClientAuthMethods, getClientsUsers } = require('../controllers/clientController');

const router = express.Router();

router.get('/get_client_methods/:client_id', getClientAuthMethods);
router.get('/get_client_users/:client_id',getClientsUsers);

module.exports = router;
