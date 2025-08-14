// routes/api.js

const express = require("express");
const { controlLockerDoor } = require("../controllers/lockerDoorController");
const { controlLockerDoorAutoAssign } = require("../controllers/LockerAutoController");
const { assignLockerToUser, validateAccessCode, pickupItem, endLockerSession } = require("../controllers/LockerSelectedDoorController");
const { registerFace, verifyFace } = require("../controllers/FaceController");
const { registerCard, verifyCard } = require("../controllers/CardReaderController");

const router = express.Router();

// 🔐 Locker Control
router.post("/control-door/:door_id", controlLockerDoor);
router.post("/control-door-auto", controlLockerDoorAutoAssign);

// 🚪 Locker Assignment & Access
router.post("/select-door/:door_id", assignLockerToUser);
router.post("/validate-access-code", validateAccessCode);
router.post("/pick-up/:door_id", pickupItem);
router.post("/end-session/:door_id", endLockerSession);

// 😊 Face Authentication
router.post("/register-face/:user_id", registerFace);
router.post("/verify-face/:user_id", verifyFace); 

// 💳 Card Authentication
router.post("/card-register/:user_id", registerCard);
router.post("/card-verify", verifyCard); 

module.exports = router;