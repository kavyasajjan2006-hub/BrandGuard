
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const ComplianceReview = require("../models/ComplianceReview");

const generateComplianceReport = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID.",
      });
    }

    const review = await ComplianceReview.findOne({
      _id: reviewId,
      createdBy: req.user._id,
    }).populate("brand", "name");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Compliance review not found.",
      });
    }

    const findings = review.findings || [];
    const evidence = review.evidence || [];
    const score = Number.isFinite(review.overallScore)
      ? review.overallScore
      : 0;

    const riskLevel =
      review.riskLevel ||
      (score >= 85
        ? "low"
        : score >= 70
          ? "medium"
          : score >= 40
            ? "high"
            : "critical");

    const filename = `BrandGuard-Report-${review._id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    const pdf = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: false,
      info: {
        Title: "BrandGuard Compliance Report",
        Author: "BrandGuard",
        Subject: "Brand compliance review",
      },
    });

    pdf.on("error", (error) => {
      console.error("PDF generation error:", error.message);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Could not generate the compliance report.",
        });
      } else {
        res.destroy(error);
      }
    });

    pdf.pipe(res);

    pdf.fontSize(23).text("BrandGuard", { align: "center" });
    pdf.moveDown(0.3);
    pdf.fontSize(17).text("Compliance Review Report", {
      align: "center",
    });

    pdf.moveDown();
    pdf.fontSize(10).fillColor("#555555").text(
      `Generated: ${new Date().toLocaleString()}`
    );
    pdf.fillColor("#000000");
    pdf.moveDown();

    pdf.fontSize(15).text("1. Review Details");
    pdf.moveDown(0.4);

    pdf.fontSize(11);
    pdf.text(`Brand: ${review.brand?.name || "Unknown brand"}`);
    pdf.text(`Review title: ${review.title || "Untitled review"}`);
    pdf.text(`Review ID: ${review._id}`);
    pdf.text(`Description: ${review.description || "Not provided"}`);
    pdf.text(`Review status: ${review.status || "Not specified"}`);
    pdf.text(`Compliance score: ${score}/100`);
    pdf.text(`Risk level: ${String(riskLevel).toUpperCase()}`);
    pdf.text(`Total findings: ${findings.length}`);
    pdf.text(
      `Review date: ${
        review.reviewedAt
          ? new Date(review.reviewedAt).toLocaleDateString()
          : "Not recorded"
      }`
    );

    pdf.moveDown();
    pdf.fontSize(15).text("2. Compliance Findings");
    pdf.moveDown(0.4);

    if (findings.length === 0) {
      pdf.fontSize(11).text("No findings recorded for this review.");
    } else {
      findings.forEach((finding, index) => {
        pdf.fontSize(12).text(
          `${index + 1}. ${finding.title || "Untitled finding"}`,
          { continued: false }
        );

        pdf.fontSize(10);
        pdf.text(`Severity: ${finding.severity || "Not specified"}`);
        pdf.text(`Status: ${finding.status || "Not specified"}`);
        pdf.text(
          `Description: ${finding.description || "Not provided"}`
        );
        pdf.text(
          `Recommendation: ${
            finding.recommendation || "No recommendation provided"
          }`
        );
        pdf.moveDown(0.8);
      });
    }

    pdf.moveDown(0.5);
    pdf.fontSize(15).text("3. Supporting Evidence");
    pdf.moveDown(0.4);

    if (evidence.length === 0) {
      pdf.fontSize(11).text("No evidence files attached to this review.");
    } else {
      evidence.forEach((file, index) => {
        pdf.fontSize(10).text(
          `${index + 1}. ${file.originalName || "Unnamed file"}`
        );
        pdf.text(`File type: ${file.mimeType || "Unknown"}`);
        pdf.text(
          `File size: ${
            Number.isFinite(file.size)
              ? `${(file.size / 1024).toFixed(2)} KB`
              : "Unknown"
          }`
        );
        pdf.text(
          `Uploaded: ${
            file.uploadedAt
              ? new Date(file.uploadedAt).toLocaleString()
              : "Unknown"
          }`
        );
        pdf.moveDown(0.4);
      });
    }

    pdf.moveDown();
    pdf.fontSize(9).fillColor("#555555").text(
      "This report reflects the information recorded in BrandGuard at the time of generation."
    );

    pdf.end();
  } catch (error) {
    console.error("Compliance report error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Could not generate the compliance report.",
      });
    } else {
      res.destroy(error);
    }
  }
};

module.exports = { generateComplianceReport };
