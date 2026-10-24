
const express = require("express");

const {
  createReview,
  getMyReviews,
  updateReviewStatus,
  updateFindingStatus,
  getReviewScore,
  getDashboardStats,
  uploadReviewEvidence,
  downloadReviewEvidence,
  deleteReviewEvidence,
} = require("../controllers/complianceReviewController");

const {
  generateComplianceReport,
} = require("../controllers/complianceReportController");

const { protect } = require("../middleware/authMiddleware");
const { uploadEvidence } = require("../middleware/uploadMiddleware");

const {
  validateCreateReview,
  validateReviewStatus,
  validateFindingStatus,
} = require("../middleware/reviewValidation");

const router = express.Router();

router.use(protect);

router.get("/dashboard/stats", getDashboardStats);
router.get("/:reviewId/report/pdf", generateComplianceReport);
router.get("/:reviewId/score", getReviewScore);
router.get("/", getMyReviews);

router.post("/", validateCreateReview, createReview);

router.patch(
  "/:reviewId/status",
  validateReviewStatus,
  updateReviewStatus
);

router.patch(
  "/:reviewId/findings/:findingId",
  validateFindingStatus,
  updateFindingStatus
);

router.post("/:reviewId/evidence", uploadEvidence, uploadReviewEvidence);

router.get(
  "/:reviewId/evidence/:evidenceId/download",
  downloadReviewEvidence
);

router.delete(
  "/:reviewId/evidence/:evidenceId",
  deleteReviewEvidence
);

module.exports = router;
