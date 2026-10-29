
const { checkCompliance } = require("../utils/complianceChecker");
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");

const Brand = require("../models/Brand");
const ComplianceReview = require("../models/ComplianceReview");
const { reviewContent } = require("../utils/complianceEngine");
const { sendEmail } = require("../utils/emailService");

const evidenceDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "evidence"
);

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function removeUploadedFiles(files = []) {
  await Promise.all(
    files.map((file) => fs.unlink(file.path).catch(() => {}))
  );
}

function evidenceMetadata(file) {
  return {
    originalName: path.basename(file.originalname),
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  };
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

async function sendReviewNotification(user, subject, message) {
  try {
    if (!user?.email) return;

    await sendEmail({
      to: user.email,
      subject,
      text: message,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>BrandGuard Notification</h2>
          <p>${escapeHtml(message)}</p>
          <p>Regards,<br>BrandGuard Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Email notification failed:", error.message);
  }
}

function normalizeSeverity(value) {
  const severity = String(value || "medium").toLowerCase();

  return ["critical", "high", "medium", "low"].includes(severity)
    ? severity
    : "medium";
}

function normalizeEngineFinding(finding = {}) {
  return {
    title: finding.title || finding.type || "Compliance issue",
    description:
      finding.explanation ||
      finding.description ||
      finding.message ||
      "",
    severity: normalizeSeverity(finding.severity),
    recommendation:
      finding.suggestedFix ||
      finding.recommendation ||
      finding.suggestion ||
      "Review this issue manually.",
    status: "open",
  };
}

function countFindings(findings = []) {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const finding of findings) {
    counts[normalizeSeverity(finding.severity)]++;
  }

  return counts;
}

// CREATE REVIEW AND RUN BOTH COMPLIANCE ENGINES.
async function createReview(req, res, next) {
  try {
   const {
  brandId,
  title,
  description: submittedDescription,
  content: submittedContent,
} = req.body;

const description = submittedDescription ?? submittedContent;

    if (
      !brandId ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Brand, title, and description are required.",
      });
    }

    if (!validId(brandId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID.",
      });
    }

    const brand = await Brand.findOne({
      _id: brandId,
      createdBy: req.user._id,
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found.",
      });
    }

    const content = description.trim();

    // Run both compliance engines.
    const [existingResultRaw, checkerResultRaw] = await Promise.all([
      Promise.resolve(reviewContent({ content, brand })),
      Promise.resolve(checkCompliance(content, brand)),
    ]);

    const existingResult = existingResultRaw || {};
    const checkerResult = checkerResultRaw || {};

    const existingFindings = (
      existingResult.findings || []
    ).map(normalizeEngineFinding);

    const checkerIssues = (
      checkerResult.issues || []
    ).map((issue) => ({
      title: issue.type
        ? String(issue.type).replace(/_/g, " ")
        : "Compliance issue",
      description: issue.message || issue.description || "",
      severity: normalizeSeverity(issue.severity),
      recommendation:
        issue.suggestion ||
        issue.recommendation ||
        "Review this issue manually.",
      status: "open",
    }));

    // Combine findings from both engines and remove exact duplicates.
    const seen = new Set();

    const generatedFindings = [
      ...existingFindings,
      ...checkerIssues,
    ].filter((finding) => {
      const key = [
        finding.title,
        finding.description,
        finding.recommendation,
        finding.severity,
      ]
        .join("|")
        .toLowerCase()
        .trim();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });

    // Save the review. The model calculates score and risk level.
    const review = await ComplianceReview.create({
      brand: brand._id,
      createdBy: req.user._id,
      title: title.trim(),
      description: content,
      findings: generatedFindings,
    });

    await review.populate("brand", "name");

    await sendReviewNotification(
      req.user,
      "BrandGuard: Compliance Review Created",
      `Your compliance review "${review.title}" for brand "${
        review.brand?.name || "Unknown brand"
      }" has been created successfully.`
    );

    // Calculate all displayed totals from the saved findings.
    const savedFindings = review.findings || [];
    const findingCounts = countFindings(savedFindings);
    const totalFindings = savedFindings.length;

    const checkerCounts = countFindings(checkerIssues);

    const summary =
      `Found ${totalFindings} finding(s): ` +
      `${findingCounts.critical} critical, ` +
      `${findingCounts.high} high, ` +
      `${findingCounts.medium} medium, ` +
      `${findingCounts.low} low.`;

    return res.status(201).json({
      success: true,
      message: "Compliance review created successfully.",
      review,

      compliance: {
        score: review.overallScore,
        checkerScore: review.overallScore,
        riskLevel: review.riskLevel,

        issueCount: totalFindings,
        totalFindings,

        summary,
        counts: findingCounts,
        findingCounts,

        // Separate checker information for debugging.
        checkerIssueCount: checkerIssues.length,
        checkerCounts,

        // The dashboard can use these findings.
        issues: savedFindings,
        checkerIssues,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET SIGNED-IN USER'S REVIEWS.
async function getMyReviews(req, res, next) {
  try {
    const filter = {
      createdBy: req.user._id,
    };

    if (req.query.brandId) {
      if (!validId(req.query.brandId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand ID.",
        });
      }

      filter.brand = req.query.brandId;
    }

    const reviews = await ComplianceReview.find(filter)
      .populate("brand", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
}

// UPDATE REVIEW STATUS.
async function updateReviewStatus(req, res, next) {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;

    if (!validId(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID.",
      });
    }

    if (!["draft", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be draft, in_progress, or completed.",
      });
    }

    const review = await ComplianceReview.findOne({
      _id: reviewId,
      createdBy: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const previousStatus = review.status;

    review.status = status;
    review.reviewedAt =
      status === "completed" ? new Date() : null;

    await review.save();

    if (previousStatus !== status) {
      await sendReviewNotification(
        req.user,
        "BrandGuard: Review Status Updated",
        `The status of your compliance review "${review.title}" has changed from "${
          previousStatus || "unspecified"
        }" to "${status}".`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Review status updated successfully.",
      review,
    });
  } catch (error) {
    next(error);
  }
}

// UPDATE FINDING STATUS OR EDIT ITS SUGGESTED FIX.
async function updateFindingStatus(req, res, next) {
  try {
    const { reviewId, findingId } = req.params;
    const { status, recommendation } = req.body;

    if (!validId(reviewId) || !validId(findingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID or finding ID.",
      });
    }

    if (
      status !== undefined &&
      !["open", "resolved", "accepted"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Status must be open, resolved, or accepted.",
      });
    }

    if (
      recommendation !== undefined &&
      typeof recommendation !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Recommendation must be text.",
      });
    }

    if (status === undefined && recommendation === undefined) {
      return res.status(400).json({
        success: false,
        message: "Provide a status or an edited recommendation.",
      });
    }

    const review = await ComplianceReview.findOne({
      _id: reviewId,
      createdBy: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const finding = review.findings.id(findingId);

    if (!finding) {
      return res.status(404).json({
        success: false,
        message: "Finding not found.",
      });
    }

    if (status !== undefined) {
      finding.status = status;
    }

    if (recommendation !== undefined) {
      finding.recommendation = recommendation.trim();
    }

    await review.save();

    return res.status(200).json({
      success: true,
      message: "Finding updated successfully.",
      finding,
      score: review.overallScore,
      riskLevel: review.riskLevel,
      findingsCount: review.findings.length,
    });
  } catch (error) {
    next(error);
  }
}

// GET REVIEW SCORE.
async function getReviewScore(req, res, next) {
  try {
    const { reviewId } = req.params;

    if (!validId(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID.",
      });
    }

    const review = await ComplianceReview.findOne({
      _id: reviewId,
      createdBy: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      reviewId: review._id,
      score: review.overallScore,
      riskLevel: review.riskLevel,
      findingsCount: review.findings.length,
    });
  } catch (error) {
    next(error);
  }
}

// DASHBOARD STATISTICS.
async function getDashboardStats(req, res, next) {
  try {
    const reviews = await ComplianceReview.find({
      createdBy: req.user._id,
    });

    const totalReviews = reviews.length;

    const averageScore = totalReviews
      ? Math.round(
          reviews.reduce(
            (sum, review) => sum + (review.overallScore ?? 100),
            0
          ) / totalReviews
        )
      : 0;

    let totalFindings = 0;
    let unresolvedFindings = 0;

    const riskCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const review of reviews) {
      totalFindings += review.findings.length;

      unresolvedFindings += review.findings.filter(
        (finding) => finding.status !== "resolved"
      ).length;

      const risk = String(review.riskLevel || "").toLowerCase();

      if (Object.prototype.hasOwnProperty.call(riskCounts, risk)) {
        riskCounts[risk]++;
      }
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalReviews,
        averageScore,
        totalFindings,
        unresolvedFindings,
        riskCounts,
      },
    });
  } catch (error) {
    next(error);
  }
}

// UPLOAD EVIDENCE.
async function uploadReviewEvidence(req, res, next) {
  try {
    const { reviewId } = req.params;

    if (!validId(reviewId)) {
      await removeUploadedFiles(req.files);

      return res.status(400).json({
        success: false,
        message: "Invalid review ID.",
      });
    }

    const review = await ComplianceReview.findOne({
      _id: reviewId,
      createdBy: req.user._id,
    });

    if (!review) {
      await removeUploadedFiles(req.files);

      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one evidence file.",
      });
    }

    const newEvidence = req.files.map(evidenceMetadata);

    review.evidence.push(...newEvidence);

    try {
      await review.save();
    } catch (error) {
      await removeUploadedFiles(req.files);
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Evidence uploaded successfully.",
      evidence: newEvidence,
    });
  } catch (error) {
    next(error);
  }
}

// DOWNLOAD EVIDENCE.
async function downloadReviewEvidence(req, res, next) {
  try {
    const { reviewId, evidenceId } = req.params;

    if (!validId(reviewId) || !validId(evidenceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID or evidence ID.",
      });
    }

    const review = await ComplianceReview.findOne({
      _id: reviewId,
      createdBy: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const evidence = review.evidence.id(evidenceId);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: "Evidence not found.",
      });
    }

    const safeStoredName = path.basename(evidence.storedName);
    const filePath = path.resolve(
      evidenceDirectory,
      safeStoredName
    );

    if (!filePath.startsWith(evidenceDirectory + path.sep)) {
      return res.status(400).json({
        success: false,
        message: "Invalid evidence file path.",
      });
    }

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: "Evidence file is missing from storage.",
      });
    }

    return res.download(
      filePath,
      evidence.originalName,
      (error) => {
        if (error && !res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Unable to download evidence.",
          });
        }
      }
    );
  } catch (error) {
    next(error);
  }
}

// DELETE EVIDENCE.
async function deleteReviewEvidence(req, res, next) {
  try {
    const { reviewId, evidenceId } = req.params;

    if (!validId(reviewId) || !validId(evidenceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID or evidence ID.",
      });
    }

    const review = await ComplianceReview.findOne({
      _id: reviewId,
      createdBy: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const evidence = review.evidence.id(evidenceId);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: "Evidence not found.",
      });
    }

    const storedName = path.basename(evidence.storedName);
    const filePath = path.resolve(
      evidenceDirectory,
      storedName
    );

    if (!filePath.startsWith(evidenceDirectory + path.sep)) {
      return res.status(400).json({
        success: false,
        message: "Invalid evidence file path.",
      });
    }

    const originalName = evidence.originalName;

    review.evidence.pull({ _id: evidenceId });
    await review.save();

    await fs.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") {
        console.error(
          "Could not remove evidence file:",
          error.message
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: "Evidence deleted successfully.",
      evidenceId,
      originalName,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReview,
  getMyReviews,
  updateReviewStatus,
  updateFindingStatus,
  getReviewScore,
  getDashboardStats,
  uploadReviewEvidence,
  downloadReviewEvidence,
  deleteReviewEvidence,
};