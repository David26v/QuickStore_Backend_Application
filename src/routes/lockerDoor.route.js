const express = require("express");
const { controlLockerDoor } = require("../controllers/lockerDoorController");

const router = express.Router();

router.post("/control-door/:door_id", controlLockerDoor);

module.exports = router;
