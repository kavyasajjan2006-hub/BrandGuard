
function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPhrase(text, phrase) {
  const value = String(phrase ?? "").trim();
  if (!value) return false;

  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegex(value)}(?=$|[^a-z0-9])`,
    "i"
  );

  return pattern.test(String(text ?? ""));
}

function toList(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // Support a JSON array stored as text.
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Treat invalid JSON as ordinary text below.
      }
    }

    return trimmed
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getFirstValue(brand, keys) {
  for (const key of keys) {
    if (brand && brand[key] != null) {
      const value = brand[key];
      if (Array.isArray(value) ? value.length > 0 : String(value).trim()) {
        return value;
      }
    }
  }

  return [];
}

function checkCompliance(content, brand = {}) {
  const text = String(content ?? "");
  const issues = [];
  const seen = new Set();

  function addIssue(type, severity, message, matchedText, suggestion) {
    const key = [
      type,
      normalize(matchedText),
      normalize(message),
    ].join("|");

    if (seen.has(key)) return;
    seen.add(key);

    issues.push({
      id: `finding-${issues.length + 1}`,
      type,
      severity,
      message,
      matchedText: matchedText || "",
      suggestion: suggestion || "Review this finding manually.",
      status: "open",
    });
  }

  // Read the Brand Kit's terminology and prohibited-phrase fields.
  const prohibited = [
    ...toList(brand.prohibitedPhrases),
    ...toList(brand.prohibited_phrases),
  ];

  for (const phrase of new Set(prohibited.map(String))) {
    if (findPhrase(text, phrase)) {
      addIssue(
        "prohibited_phrase",
        "high",
        `"${phrase}" is prohibited by the brand guidelines.`,
        phrase,
        `Remove "${phrase}" or replace it with wording approved by the brand owner.`
      );
    }
  }

  // Accept terminology rules as objects or text such as:
  // Use "customer" instead of "consumer".
  const terminologyRules = [
    ...toList(brand.approvedTerminology),
    ...toList(brand.approved_terminology),
    ...toList(brand.terminologyRules),
    ...toList(brand.terminology_rules),
  ];

  for (const rule of terminologyRules) {
    let approved = "";
    let incorrect = "";

    if (typeof rule === "string") {
      const match = rule.match(
        /use\s+["']?(.+?)["']?\s+instead of\s+["']?(.+?)["']?\s*$/i
      );

      if (match) {
        approved = match[1].trim().replace(/["']+$/g, "");
        incorrect = match[2].trim().replace(/^["']|["']$/g, "");
      }
    } else if (rule && typeof rule === "object") {
      approved = String(
        rule.approved ?? rule.preferred ?? rule.use ?? ""
      ).trim();

      incorrect = String(
        rule.incorrect ?? rule.disallowed ?? rule.avoid ?? ""
      ).trim();
    }

    if (
      approved &&
      incorrect &&
      findPhrase(text, incorrect)
    ) {
      addIssue(
        "terminology",
        "medium",
        `Use "${approved}" instead of "${incorrect}" to follow the brand's terminology rules.`,
        incorrect,
        `Replace "${incorrect}" with "${approved}".`
      );
    }
  }

  // Read approved facts. These are used as a reference for claim checks.
  const approvedFacts = [
    ...toList(brand.approvedFacts),
    ...toList(brand.approved_facts),
  ]
    .map((fact) => {
      if (typeof fact === "string") return fact.trim();

      if (fact && typeof fact === "object") {
        return String(
          fact.fact ?? fact.text ?? fact.claim ?? fact.description ?? ""
        ).trim();
      }

      return "";
    })
    .filter(Boolean);

  // Claims that need special verification.
  const riskyClaimPatterns = [
    /\b100\s*%\s*(?:effective|safe|guaranteed|natural)\b/i,
    /\bguaranteed\s+(?:results|success|cure|recovery)\b/i,
    /\bcures?\s+(?:all|every|any)\s+\w+/i,
    /\bapproved by (?:the )?(?:fda|government|regulator)\b/i,
    /\b(?:number one|no\.?\s*1|#1|best in the world)\b/i,
    /\b(?:clinically proven|scientifically proven|certified)\b/i,
  ];

  for (const pattern of riskyClaimPatterns) {
    for (const match of text.matchAll(
      new RegExp(pattern.source, "gi")
    )) {
      const claim = match[0];

      addIssue(
        "claim_verification",
        "high",
        `The claim "${claim}" may require evidence or regulatory approval. Verify it before publication.`,
        claim,
        "Check the exact claim against approved brand facts and supporting evidence. Remove or qualify it if it cannot be verified."
      );
    }
  }

  // Flag specific measurable or absolute claims that are not found in
  // the approved facts. This is a rule-based check, not semantic proof.
  const measurableClaimPattern =
    /\b(?:up to\s+)?\d+(?:\.\d+)?\s*(?:%|percent|times|x\b|days?\b|hours?\b|weeks?\b|months?\b|years?\b)\b|\b(?:guarantees?|proven to|clinically tested|certified|officially approved)\b/gi;

  const measurableClaims = [
    ...text.matchAll(measurableClaimPattern),
  ];

  for (const match of measurableClaims) {
    const claim = match[0].trim();

    const appearsInApprovedFact = approvedFacts.some(
      (fact) =>
        normalize(fact).includes(normalize(claim))
    );

    if (!appearsInApprovedFact) {
      addIssue(
        "unsupported_claim",
        "high",
        `The claim "${claim}" was not found in the approved facts. This does not prove it is false, but it needs verification.`,
        claim,
        "Verify the complete claim against an approved fact and supporting evidence. Add the verified fact to the Brand Kit if appropriate, or revise/remove the claim."
      );
    }
  }

  if (approvedFacts.length === 0) {
    addIssue(
      "missing_approved_facts",
      "low",
      "No approved facts are configured for this brand, so factual claims cannot be checked against an approved reference.",
      "",
      "Add verified product facts and explicitly approved promotional claims to the Brand Kit."
    );
  }

  const counts = {
    critical: 0,
    high: issues.filter((item) => item.severity === "high").length,
    medium: issues.filter((item) => item.severity === "medium").length,
    low: issues.filter((item) => item.severity === "low").length,
  };

  const complianceScore = Math.max(
    0,
    100 -
      counts.critical * 25 -
      counts.high * 20 -
      counts.medium * 10 -
      counts.low * 5
  );

  return {
    complianceScore,
    status:
      counts.critical > 0 || counts.high > 0
        ? "needs_review"
        : issues.length > 0
          ? "review_suggested"
          : "compliant",
    summary: `Found ${issues.length} issue(s): ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low.`,
    issues,
    counts,
  };
}

module.exports = { checkCompliance };
