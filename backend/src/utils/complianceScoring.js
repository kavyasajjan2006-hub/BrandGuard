const penalties = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

function calculateComplianceScore(findings = []) {
  let deductions = 0;

  for (const finding of findings) {
    // Resolved findings no longer reduce the score.
    if (finding.status === "resolved") {
      continue;
    }

    const severity = String(
      finding.severity || "medium"
    ).toLowerCase();

    deductions += penalties[severity] ?? penalties.medium;
  }

  const score = Math.max(
    0,
    Math.min(100, 100 - deductions)
  );

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

  return {
    score,
    riskLevel,
  };
}

module.exports = {
  calculateComplianceScore,
};