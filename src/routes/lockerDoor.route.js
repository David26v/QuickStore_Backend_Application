const express = require("express");
const { controlLockerDoor } = require("../controllers/lockerDoorController");
const { controlLockerDoorAutoAssign } = require("../controllers/LockerAutoController");
const { assignLockerToUser, validateAccessCode } = require("../controllers/LockerSelectedDoorController");

const router = express.Router();

router.post("/control-door/:door_id", controlLockerDoor);
router.post("/control-door-auto", controlLockerDoorAutoAssign); 
router.post("/select-door/:door_id", assignLockerToUser);
router.post("/validate-access-code", validateAccessCode);

module.exports = router;
 