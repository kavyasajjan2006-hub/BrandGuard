
const penalties = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

function calculateComplianceScore(findings = []) {
  let deductions = 0;

  for (const finding of findings) {
    if (finding.status !== "resolved") {
      deductions += penalties[finding.severity] || 0;
    }
  }

  const score = Math.max(0, Math.min(100, 100 - deductions));

  let riskLevel;

  if (score >= 85) {
    riskLevel = "low";
  } else if (score >= 70) {
    riskLevel = "medium";
  } else if (score >= 40) {
    riskLevel = "high";
  } else {
    riskLevel = "critical";
  }

  return { score, riskLevel };
}

module.exports = { calculateComplianceScore };
