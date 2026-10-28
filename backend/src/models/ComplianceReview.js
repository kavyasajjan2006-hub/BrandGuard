
const mongoose = require("mongoose");
const { calculateComplianceScore } = require("../utils/complianceScoring");

// Schema for each compliance finding
const findingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    recommendation: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "resolved", "accepted"],
      default: "open",
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

// Schema for a compliance review
const complianceReviewSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    status: {
      type: String,
      enum: ["draft", "in_progress", "completed"],
      default: "draft",
    },

    findings: {
      type: [findingSchema],
      default: [],
    },

    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },

    riskLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    evidence: [
      {
        originalName: {
          type: String,
          maxlength: 255,
        },
        storedName: {
          type: String,
          maxlength: 255,
        },
        mimeType: {
          type: String,
          maxlength: 100,
        },
        size: {
          type: Number,
          min: 0,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Calculate score and risk level before validating a document.
complianceReviewSchema.pre("validate", function () {
  const result = calculateComplianceScore(this.findings || []);

  this.overallScore = result.score;
  this.riskLevel = result.riskLevel;
});

// Recalculate score when the complete findings array is updated.
complianceReviewSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate() || {};

  // Only recalculate when findings are explicitly updated.
  const hasFindings =
    Object.prototype.hasOwnProperty.call(update, "findings") ||
    Object.prototype.hasOwnProperty.call(update.$set || {}, "findings");

  if (!hasFindings) {
    return;
  }

  const existingReview = await this.model
    .findOne(this.getQuery())
    .select("findings")
    .lean();

  if (!existingReview) {
    return;
  }

  const findings =
    update.$set?.findings !== undefined
      ? update.$set.findings
      : update.findings;

  const result = calculateComplianceScore(findings || []);

  this.set({
    overallScore: result.score,
    riskLevel: result.riskLevel,
  });
});

module.exports = mongoose.model(
  "ComplianceReview",
  complianceReviewSchema
);
