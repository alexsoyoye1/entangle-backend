const router = require("express").Router();
const { healthCheck } = require("../controllers/healthController");
router.get("/", healthCheck);
module.exports = router;
