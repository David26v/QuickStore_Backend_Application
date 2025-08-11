const express = require("express");
const { controlLockerDoor } = require("../controllers/lockerDoorController");
const { controlLockerDoorAutoAssign } = require("../controllers/LockerAutoController");

const router = express.Router();

router.post("/control-door/:door_id", controlLockerDoor);
router.post("/control-door-auto", controlLockerDoorAutoAssign); 

module.exports = router;
