
const crypto = require("crypto");

// Convert an array or comma/newline-separated string into a clean list.
function toList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

// Escape special regex characters so phrases are treated as literal text.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Match a complete phrase rather than part of a longer word.
function containsPhrase(text, phrase) {
  const trimmedPhrase = String(phrase || "").trim();

  if (!trimmedPhrase) {
    return false;
  }

  const escapedPhrase = escapeRegex(trimmedPhrase);

  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapedPhrase}(?=$|[^\\p{L}\\p{N}])`,
    "iu"
  );

  return pattern.test(text);
}

// Create a consistent finding structure.
function makeFinding({
  category,
  severity,
  title,
  explanation,
  evidence,
  suggestion,
  source,
}) {
  return {
    id: crypto.randomUUID(),
    category,
    severity,
    title,
    explanation,
    evidence,
    suggestedFix: suggestion,
    source,
    status: "open",
    suggestionStatus: "pending",
  };
}

// Main BrandGuard compliance checker.
function reviewContent({ content, brand }) {
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Content is required for a compliance review.");
  }

  if (!brand || typeof brand !== "object") {
    throw new Error("A valid Brand Kit is required.");
  }

  const text = content.trim();
  const findings = [];

  const prohibitedPhrases = toList(brand.prohibitedPhrases);

  const approvedTerminology = toList(
    brand.approvedTerminology ??
      brand.approvedFacts?.approvedTerminology
  );

  const approvedFacts = toList(brand.approvedFacts);

  // 1. Detect prohibited phrases.
  for (const phrase of prohibitedPhrases) {
    if (!containsPhrase(text, phrase)) {
      continue;
    }

    findings.push(
      makeFinding({
        category: "prohibited_phrase",
        severity: "high",
        title: "Prohibited phrase detected",
        explanation:
          `The content contains "${phrase}", which is listed as prohibited in this Brand Kit.`,
        evidence: phrase,
        suggestion:
          `Remove "${phrase}" and rewrite the sentence using wording that complies with the brand rules and is supported by approved evidence.`,
        source: `Brand Kit: Prohibited phrases — "${phrase}"`,
      })
    );
  }

  // 2. Check preferred terminology.
  // Configure entries as: preferred term => alternative term
  // Example: skin hydration => moisture miracle
  for (const entry of approvedTerminology) {
    const parts = entry.split("=>").map((part) => part.trim());

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      continue;
    }

    const [preferred, alternative] = parts;

    if (!containsPhrase(text, alternative)) {
      continue;
    }

    findings.push(
      makeFinding({
        category: "terminology",
        severity: "medium",
        title: "Non-preferred terminology",
        explanation:
          `"${alternative}" is listed as an alternative that conflicts with a Brand Kit terminology rule.`,
        evidence: alternative,
        suggestion:
          `Consider replacing "${alternative}" with "${preferred}" if the replacement preserves the intended meaning.`,
        source: `Brand Kit terminology rule: ${preferred} => ${alternative}`,
      })
    );
  }

  // 3. Flag potentially risky promotional claims.
  const riskyClaimPatterns = [
    {
      regex: /\b(?:guarantee|guarantees|guaranteed|guaranteeing)\b/iu,
      evidence: "guarantee",
      explanation:
        "Guarantees can create absolute promises that need suitable evidence and approval.",
    },
    {
      regex: /\b(?:cure|cures|cured|curing|treat|treats|treated|treating|heal|heals|healed|healing)\b/iu,
      evidence: "medical or treatment claim",
      explanation:
        "Medical or treatment claims may require specific substantiation and regulatory review.",
    },
    {
      regex: /\b100\s*%\s*(?:effective|safe|guaranteed)\b/iu,
      evidence: "absolute percentage claim",
      explanation:
        "An absolute effectiveness, safety, or guarantee claim should be supported by appropriate evidence.",
    },
    {
      regex: /\b(?:best|fastest|always|never|permanent|permanently)\b|#\s*1\b|\bnumber\s*1\b/iu,
      evidence: "absolute or comparative claim",
      explanation:
        "Absolute or comparative wording may require substantiation or may conflict with brand guidelines.",
    },
    {
      regex: /\b(?:clinically|scientifically)\s+proven\b/iu,
      evidence: "proof claim",
      explanation:
        "A clinical or scientific proof claim should be supported by suitable documented evidence.",
    },
  ];

  for (const rule of riskyClaimPatterns) {
    const match = text.match(rule.regex);

    if (!match) {
      continue;
    }

    findings.push(
      makeFinding({
        category: "promotional_claim",
        severity: "high",
        title: "Claim requires verification",
        explanation: rule.explanation,
        evidence: match[0],
        suggestion:
          "Verify the claim against current approved evidence. If evidence is unavailable, remove the absolute wording or rewrite the statement as a qualified, factual claim.",
        source: "BrandGuard promotional-claim rule",
      })
    );
  }

  // 4. Check factual or promotional statements against approved facts.
  // This is a keyword heuristic, not a semantic fact-checker.
  if (approvedFacts.length > 0) {
    const claimSentences = text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    const claimSignal =
      /\b(?:offers?|contains?|includes?|made\s+with|made\s+from|reduces?|improves?|increases?|decreases?|supports?|proven|guaranteed|cures?|treats?|prevents?|lasts?|results?|percent|faster|stronger|best|clinically|scientifically)\b|%|#\s*1\b/iu;

    for (const sentence of claimSentences) {
      if (!claimSignal.test(sentence)) {
        continue;
      }

      const sentenceLower = sentence.toLowerCase();

      const matchingFact = approvedFacts.some((fact) => {
        const meaningfulWords =
          fact.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [];

        if (meaningfulWords.length === 0) {
          return false;
        }

        const matchingWords = meaningfulWords.filter((word) =>
          sentenceLower.includes(word)
        );

        // Require at least one matching word for a one-word fact,
        // or two matching words for longer facts.
        const requiredMatches = Math.min(2, meaningfulWords.length);

        return matchingWords.length >= requiredMatches;
      });

      if (matchingFact) {
        continue;
      }

      findings.push(
        makeFinding({
          category: "unsupported_claim",
          severity: "medium",
          title: "Claim not matched to an approved fact",
          explanation:
            "This sentence appears to contain a factual or promotional claim, but the rule-based checker could not match it to the approved facts. This does not prove that the claim is false.",
          evidence: sentence,
          suggestion:
            "Add a relevant approved fact or supporting evidence, or rewrite the statement to avoid an unverified claim.",
          source: "Brand Kit: Approved facts — no clear match found",
        })
      );
    }
  }

  // 5. Remove duplicate findings.
  const uniqueFindings = [];
  const seen = new Set();

  for (const finding of findings) {
    const key = [
      finding.category,
      finding.evidence.toLowerCase(),
      finding.title,
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueFindings.push(finding);
  }

  // 6. Calculate a rule-based compliance score.
  const weights = {
    high: 20,
    medium: 10,
    low: 5,
  };

  const deduction = uniqueFindings.reduce(
    (total, finding) => total + (weights[finding.severity] || 0),
    0
  );

  const complianceScore = Math.max(0, 100 - deduction);

  // 7. Return the result for the controller and frontend.
  return {
    complianceScore,
    issueCount: uniqueFindings.length,
    findings: uniqueFindings,
    reviewSummary:
      uniqueFindings.length === 0
        ? "No issues were detected by the configured rule checks. This does not guarantee full compliance."
        : `Detected ${uniqueFindings.length} potential issue(s). Review the findings and verify claims before publishing.`,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = { reviewContent };
