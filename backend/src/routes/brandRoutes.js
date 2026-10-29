
const express = require("express");
const {
  createBrand,
  getMyBrands,
} = require("../controllers/brandController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All brand endpoints require authentication.
router.use(protect);

router.post("/", createBrand);
router.get("/", getMyBrands);

module.exports = router;
