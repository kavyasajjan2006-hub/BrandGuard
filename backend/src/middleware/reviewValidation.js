
const mongoose = require("mongoose");

const validateCreateReview = (req, res, next) => {
  const { title, description, brandId, findings } = req.body;
  const errors = [];

  if (typeof title !== "string" || !title.trim()) {
    errors.push("Title is required and must be text.");
  } else if (title.trim().length > 150) {
    errors.push("Title cannot exceed 150 characters.");
  }

  if (typeof description !== "string" || !description.trim()) {
    errors.push("Description is required and must be text.");
  } else if (description.length > 2000) {
    errors.push("Description cannot exceed 2000 characters.");
  }

  if (
    typeof brandId !== "string" ||
    !mongoose.Types.ObjectId.isValid(brandId)
  ) {
    errors.push("A valid brandId is required.");
  }

  if (findings !== undefined && !Array.isArray(findings)) {
    errors.push("Findings must be an array.");
  }

  if (Array.isArray(findings)) {
    if (findings.length > 100) {
      errors.push("A review cannot contain more than 100 findings.");
    }

    findings.forEach((finding, index) => {
      if (!finding || typeof finding !== "object" || Array.isArray(finding)) {
        errors.push(`Finding ${index + 1} must be an object.`);
        return;
      }

      if (typeof finding.title !== "string" || !finding.title.trim()) {
        errors.push(`Finding ${index + 1} needs a title.`);
      } else if (finding.title.trim().length > 200) {
        errors.push(`Finding ${index + 1} title cannot exceed 200 characters.`);
      }

      if (
        finding.severity !== undefined &&
        !["critical", "high", "medium", "low"].includes(finding.severity)
      ) {
        errors.push(`Finding ${index + 1} has an invalid severity.`);
      }

      if (
        finding.recommendation !== undefined &&
        typeof finding.recommendation !== "string"
      ) {
        errors.push(`Finding ${index + 1} recommendation must be text.`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Review validation failed.",
      errors,
    });
  }

  next();
};

const validateReviewStatus = (req, res, next) => {
  const { status } = req.body;
  const allowedStatuses = ["draft", "in_progress", "completed"];

  if (typeof status !== "string" || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be draft, in_progress, or completed.",
    });
  }

  next();
};

const validateFindingStatus = (req, res, next) => {
  const { status } = req.body;
  const allowedStatuses = ["open", "resolved", "accepted"];

  if (typeof status !== "string" || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Finding status must be open, resolved, or accepted.",
    });
  }

  next();
};

module.exports = {
  validateCreateReview,
  validateReviewStatus,
  validateFindingStatus,
};
