
import React, { useMemo, useState } from "react";
import {
  ShieldCheck, LayoutDashboard, FileSearch, BookOpen, History, Settings,
  Bell, Search, ArrowRight, AlertTriangle, CheckCircle2, Info, X, Pencil,
  Check, Sparkles, FileText, ChevronRight, RotateCcw, Upload, FileImage, File
} from "lucide-react";

import "./App.css";
import Login from "./pages/login.jsx";
import Signup from "./pages/signup.jsx";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

// Demo Brand Kits
const BRAND_KITS = {
  novatech: {
    id: "novatech",
    name: "NovaTech",
    description: "Technology that makes life simpler.",
    approvedFacts: [
      {
        subject: "NovaPhone X",
        attribute: "Battery",
        value: "5000 mAh",
        source: "Product specification v1"
      },
      {
        subject: "NovaPhone X",
        attribute: "Warranty",
        value: "1 year",
        source: "Warranty policy v1"
      }
    ],
    bannedTerms: ["100% risk-free", "guaranteed best"],
    preferredTerms: ["NovaPhone X", "NovaTech Support"],
    tone: ["Clear", "Helpful", "Professional", "Honest"],
    guidelines: [
      "Use verified product specifications.",
      "Avoid unsupported rankings and performance claims.",
      "Use a clear, helpful, professional tone."
    ]
  },

  glowmax: {
    id: "glowmax",
    name: "GlowMax Skincare",
    description: "Skincare with a thoughtful approach.",
    approvedFacts: [
      {
        subject: "GlowMax Daily Cream",
        attribute: "Skin type",
        value: "Normal to dry skin",
        source: "Product label v1"
      },
      {
        subject: "GlowMax Daily Cream",
        attribute: "Usage",
        value: "Patch test before use",
        source: "Product directions v1"
      }
    ],
    bannedTerms: [
      "permanent fairness",
      "100% safe for everyone",
      "cures acne"
    ],
    preferredTerms: [
      "daily skincare",
      "follow product directions"
    ],
    tone: ["Reassuring", "Clear", "Inclusive", "Evidence-led"],
    guidelines: [
      "Avoid unsupported skin transformation claims.",
      "Do not promise cures or guaranteed results.",
      "Avoid absolute safety claims; encourage following product directions."
    ]
  },

  greenbasket: {
    id: "greenbasket",
    name: "GreenBasket Foods",
    description: "Good food, clearly explained.",
    approvedFacts: [
      {
        subject: "GreenBasket Oat Bites",
        attribute: "Pack size",
        value: "200 g",
        source: "Packaging specification v1"
      },
      {
        subject: "GreenBasket Oat Bites",
        attribute: "Ingredients",
        value: "Oats, dates, almonds",
        source: "Ingredient list v1"
      }
    ],
    bannedTerms: [
      "100% healthy for everyone",
      "guaranteed weight loss",
      "disease cure"
    ],
    preferredTerms: ["ingredient list", "serving suggestion"],
    tone: ["Friendly", "Clear", "Honest", "Practical"],
    guidelines: [
      "Substantiate nutrition and health claims.",
      "Do not promise weight loss or disease treatment.",
      "Describe ingredients accurately."
    ]
  }
};

const sampleContent =
  "NovaPhone X is India's No. 1 phone! It has a 2000 mAh battery and comes with a 1-year warranty. Buy now for a 100% risk-free experience.";

function reviewContent(content, brand) {
  const findings = [];

  const add = (
    category,
    severity,
    original,
    reason,
    suggestion,
    source
  ) => {
    findings.push({
      id: `${Date.now()}-${findings.length}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      category,
      severity,
      original,
      reason,
      suggestion,
      source,
      status: "OPEN"
    });
  };

  if (!content.trim()) return findings;

  const claimRules = [
    {
      pattern: /\bIndia['’]s\s+No\.?\s*1\b/gi,
      reason: "A number-one ranking needs reliable, approved supporting evidence.",
      suggestion:
        "Replace the ranking with a specific, verifiable product benefit."
    },
    {
      pattern: /\bbest\s+in\s+India\b/gi,
      reason: "A superlative claim needs evidence supporting the comparison.",
      suggestion: "Describe a specific feature that can be verified."
    },
    {
      pattern: /\bfastest\s+in\s+India\b/gi,
      reason: "A comparative speed claim needs reliable evidence.",
      suggestion: "State a verified performance specification instead."
    },
    {
      pattern: /\bguaranteed\s+results?\b/gi,
      reason: "A guarantee should only be used when supported by an approved policy.",
      suggestion:
        "Explain the expected benefit without promising a guaranteed outcome."
    },
    {
      pattern: /\b100%\s+safe\s+for\s+everyone\b/gi,
      reason: "Absolute safety claims may be misleading without strong evidence.",
      suggestion:
        "Use accurate safety information and any relevant product directions."
    },
    {
      pattern:
        /\b(permanently|permanent)\s+(cure|remove|fairness|weight loss|acne)\b/gi,
      reason:
        "This absolute outcome claim needs reliable substantiation and may mislead readers.",
      suggestion:
        "Describe only the specific, evidence-supported product benefit."
    }
  ];

  claimRules.forEach(({ pattern, reason, suggestion }) => {
    [...content.matchAll(pattern)].forEach((match) => {
      add(
        "Unsupported claim",
        "HIGH",
        match[0],
        reason,
        suggestion,
        "General claim-checking rule"
      );
    });
  });

  brand.bannedTerms.forEach((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "gi");

    [...content.matchAll(pattern)].forEach((match) => {
      add(
        "Prohibited terminology",
        "HIGH",
        match[0],
        `This phrase appears in the ${brand.name} prohibited-terms list.`,
        "Remove this phrase or replace it with an accurate, factual description.",
        `${brand.name} Brand Kit: prohibited terms`
      );
    });
  });

  brand.approvedFacts.forEach((fact) => {
    if (fact.attribute.toLowerCase() === "battery") {
      [...content.matchAll(/\b\d[\d,]*\s*mAh\b/gi)].forEach((match) => {
        if (
          match[0].replace(/[\s,]/g, "").toLowerCase() !==
          fact.value.replace(/[\s,]/g, "").toLowerCase()
        ) {
          add(
            "Fact inconsistency",
            "HIGH",
            match[0],
            `The approved battery capacity for ${fact.subject} is ${fact.value}.`,
            `Use the approved specification: ${fact.value}.`,
            fact.source
          );
        }
      });
    }

    if (fact.attribute.toLowerCase() === "warranty") {
      [
        ...content.matchAll(
          /\b\d+\s*[- ]?\s*(?:year|years|month|months)\s+warranty\b/gi
        )
      ].forEach((match) => {
        const actual = match[0]
          .replace(/warranty/i, "")
          .replace(/[-\s]/g, "")
          .toLowerCase();

        const approved = fact.value
          .replace(/[-\s]/g, "")
          .toLowerCase();

        if (actual !== approved) {
          add(
            "Fact inconsistency",
            "HIGH",
            match[0],
            `The approved warranty is ${fact.value}.`,
            `Use the approved warranty: ${fact.value}.`,
            fact.source
          );
        }
      });
    }
  });

  const tonePattern =
    /\b(best|amazing|unbelievable|incredible|ultimate|revolutionary)\b/gi;

  const toneMatches = [
    ...new Map(
      [...content.matchAll(tonePattern)].map((match) => [
        match[0].toLowerCase(),
        match[0]
      ])
    ).values()
  ];

  toneMatches.forEach((term) => {
    add(
      "Tone and language",
      "MEDIUM",
      term,
      `Review this wording against ${brand.name}'s desired tone: ${brand.tone.join(
        ", "
      )}.`,
      "Use a clear, helpful description of the product's benefits.",
      `${brand.name} Brand Kit: tone guidelines`
    );
  });

  return findings;
}

function App() {
  // Authentication screen navigation
  const [authPage, setAuthPage] = useState("login");

  // Existing dashboard state
  const [page, setPage] = useState("Overview");
  const [selectedBrandId, setSelectedBrandId] = useState("novatech");
  const [content, setContent] = useState("");
  const [findings, setFindings] = useState([]);
  const [history, setHistory] = useState([]);
  const [reviewed, setReviewed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [search, setSearch] = useState("");
  const [currentReviewId, setCurrentReviewId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const brand = BRAND_KITS[selectedBrandId];

  const activeFindings = findings.filter(
    (finding) => finding.status === "OPEN"
  );

  const highCount = activeFindings.filter(
    (finding) => finding.severity === "HIGH"
  ).length;

  const resolvedCount = findings.filter(
    (finding) => finding.status !== "OPEN"
  ).length;

  const filteredHistory = history.filter((item) =>
    `${item.preview} ${item.brandName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function handleBrandChange(event) {
    setSelectedBrandId(event.target.value);
    setUploadError("");
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setUploadError("");
    setSelectedFile(null);

    if (!file) return;

    const extensionAllowed = /\.(pdf|png|jpe?g)$/i.test(file.name);

    const allowedMimeTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg"
    ];

    if (
      !extensionAllowed ||
      (file.type && !allowedMimeTypes.includes(file.type))
    ) {
      setUploadError(
        "Unsupported file. Select a PDF, PNG, JPG, or JPEG file."
      );
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(
        "File is too large. The maximum file size is 15 MB."
      );
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  function removeSelectedFile() {
    setSelectedFile(null);
    setUploadError("");

    const input = document.getElementById("reviewFile");

    if (input) input.value = "";
  }

  function saveFindingsToHistory(updatedFindings) {
    if (currentReviewId === null) return;

    setHistory((oldHistory) =>
      oldHistory.map((review) =>
        review.id === currentReviewId
          ? {
              ...review,
              findings: updatedFindings,
              count: updatedFindings.length
            }
          : review
      )
    );
  }

  function runReview() {
    if (selectedFile) {
      setUploadError(
        "File text extraction is not connected yet. Remove the file and review pasted text for now."
      );
      return;
    }

    if (!content.trim()) {
      window.alert(
        "Please enter some content or select a supported file."
      );
      return;
    }

    const results = reviewContent(content, brand);
    const reviewId = Date.now();

    const review = {
      id: reviewId,
      content,
      findings: results,
      preview: content.slice(0, 65),
      count: results.length,
      date: new Date().toLocaleString(),
      fileName: null,
      brandId: brand.id,
      brandName: brand.name
    };

    setCurrentReviewId(reviewId);
    setFindings(results);
    setReviewed(true);
    setHistory((oldHistory) => [review, ...oldHistory]);
    setEditingId(null);
    setEditText("");
    setPage("Content review");
  }

  function updateStatus(id, status) {
    const updated = findings.map((finding) =>
      finding.id === id ? { ...finding, status } : finding
    );

    setFindings(updated);
    saveFindingsToHistory(updated);
    setEditingId(null);
    setEditText("");
  }

  function startEdit(finding) {
    setEditingId(finding.id);
    setEditText(finding.suggestion);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  function saveEdit(id) {
    if (!editText.trim()) {
      window.alert("The suggested fix cannot be empty.");
      return;
    }

    const updated = findings.map((finding) =>
      finding.id === id
        ? {
            ...finding,
            suggestion: editText.trim(),
            status: "EDITED"
          }
        : finding
    );

    setFindings(updated);
    saveFindingsToHistory(updated);
    setEditingId(null);
    setEditText("");
  }

  function startNewReview() {
    setContent("");
    setFindings([]);
    setReviewed(false);
    setEditingId(null);
    setEditText("");
    setCurrentReviewId(null);
    setIsUploading(false);
    removeSelectedFile();
    setPage("Content review");
  }

  function openReview(review) {
    if (
      !review ||
      typeof review.content !== "string" ||
      !Array.isArray(review.findings)
    ) {
      window.alert(
        "Full review details are unavailable. Please create a new review."
      );
      return;
    }

    setCurrentReviewId(review.id);
    setContent(review.content);
    setFindings(review.findings.map((finding) => ({ ...finding })));
    setReviewed(true);
    setEditingId(null);
    setEditText("");

    setSelectedBrandId(
      review.brandId && BRAND_KITS[review.brandId]
        ? review.brandId
        : "novatech"
    );

    removeSelectedFile();
    setPage("Content review");
  }

  // Login and signup screens
  if (authPage === "login") {
    return (
      <Login
        onNavigate={setAuthPage}
        onSubmit={() => {
          // Demo navigation only. Real authentication comes later.
          setAuthPage("dashboard");
        }}
      />
    );
  }

  if (authPage === "signup") {
    return (
      <Signup
        onNavigate={setAuthPage}
        onSubmit={() => {
          // Demo navigation only. Real registration comes later.
          setAuthPage("login");
        }}
      />
    );
  }

  const navItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Content review", icon: FileSearch },
    { name: "Brand Kit", icon: BookOpen },
    { name: "Review history", icon: History }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-logo">
          <div className="logo-mark">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="brand-name">BrandGuard</div>
            <div className="brand-caption">CONTENT ASSURANCE</div>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <div className="workspace-switch">
          <div className="workspace-avatar">
            {brand.name.charAt(0)}
          </div>
          <div className="workspace-text">
            <strong>{brand.name}</strong>
            <span>Selected company</span>
          </div>
          <ChevronRight size={16} />
        </div>

        <div className="nav-label">MENU</div>

        <nav className="navigation">
          {navItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => setPage(name)}
            >
              <Icon size={18} />
              <span>{name}</span>

              {name === "Content review" &&
                activeFindings.length > 0 && (
                  <span className="nav-count">
                    {activeFindings.length}
                  </span>
                )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <Sparkles size={19} />
            <strong>A second pair of eyes.</strong>
            <p>Catch issues before your content goes live.</p>
          </div>

          <button
            className="nav-item"
            onClick={() =>
              window.alert("Demo settings are not configured yet.")
            }
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <div className="profile-row">
            <div className="profile-avatar">BG</div>
            <div>
              <strong>Brand reviewer</strong>
              <span>Demo account</span>
            </div>
          </div>

          <button
            className="nav-item"
            onClick={() => setAuthPage("login")}
          >
            <ArrowRight size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>

          <div className="topbar-actions">
            <div className="demo-pill">
              <span />
              Demo mode
            </div>

            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => window.alert("No new notifications.")}
            >
              <Bell size={19} />
            </button>

            <div className="topbar-avatar">BG</div>
          </div>
        </header>

        <div className="page-content">
          {page === "Overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    YOUR CONTENT, WITH CONFIDENCE
                  </div>
                  <h1>
                    Good morning, reviewer <span>✳</span>
                  </h1>
                  <p className="subheading">
                    Let's make sure your next piece of content is ready
                    for the world.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={startNewReview}
                >
                  <FileSearch size={17} />
                  Start a review
                  <ArrowRight size={16} />
                </button>
              </div>

              <section className="welcome-banner">
                <div className="banner-copy">
                  <span className="banner-tag">
                    <Sparkles size={14} />
                    YOUR BRAND, PROTECTED
                  </span>

                  <h2>
                    Better content starts
                    <br />
                    with a second look.
                  </h2>

                  <p>
                    Review your copy against brand rules, approved facts,
                    and tone guidelines before publishing.
                  </p>

                  <button
                    className="banner-button"
                    onClick={startNewReview}
                  >
                    Review content <ArrowRight size={16} />
                  </button>
                </div>

                <div className="banner-art">
                  <div className="art-circle circle-one" />
                  <div className="art-circle circle-two" />

                  <div className="art-document">
                    <div className="art-doc-header">
                      <ShieldCheck size={22} />
                      <span>BRAND CHECK</span>
                    </div>

                    <div className="art-line long" />
                    <div className="art-line" />

                    <div className="art-flag">
                      <AlertTriangle size={16} />
                      Claim needs evidence
                    </div>

                    <div className="art-line long" />
                    <div className="art-line short" />

                    <div className="art-approved">
                      <CheckCircle2 size={16} />
                      Brand facts matched
                    </div>
                  </div>
                </div>
              </section>

              <div className="section-heading">
                <div>
                  <h2>Your review overview</h2>
                  <p>
                    A snapshot of your content checks in this session.
                  </p>
                </div>
                <span className="small-tag">SESSION DATA</span>
              </div>

              <section className="stats-grid">
                <StatCard
                  icon={<FileText />}
                  label="Total reviews"
                  value={history.length}
                  note="In this session"
                />
                <StatCard
                  icon={<AlertTriangle />}
                  label="Open findings"
                  value={activeFindings.length}
                  note="Need attention"
                  tone="orange"
                />
                <StatCard
                  icon={<CheckCircle2 />}
                  label="Resolved findings"
                  value={resolvedCount}
                  note="Actions taken"
                  tone="green"
                />
                <StatCard
                  icon={<ShieldCheck />}
                  label="High severity"
                  value={highCount}
                  note="Prioritise these"
                  tone="red"
                />
              </section>

              <section className="content-grid">
                <div className="panel recent-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Recent reviews</h3>
                      <p>Your latest content checks</p>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => setPage("Review history")}
                    >
                      View history <ArrowRight size={14} />
                    </button>
                  </div>

                  {history.length === 0 ? (
                    <EmptyState
                      icon={<History />}
                      title="Nothing reviewed yet"
                      text="Run your first review to see results here."
                      action="Start a review"
                      onClick={startNewReview}
                    />
                  ) : (
                    history.slice(0, 4).map((item) => (
                      <HistoryRow
                        key={item.id}
                        item={item}
                        onOpen={openReview}
                      />
                    ))
                  )}
                </div>

                <div className="panel checklist-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Brand readiness</h3>
                      <p>{brand.name} workspace</p>
                    </div>
                  </div>

                  <div className="readiness-score">
                    <span>Brand Kit</span>
                    <strong>Active</strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div className="checklist-row">
                    <CheckCircle2 size={17} />
                    <span>Approved facts configured</span>
                  </div>

                  <div className="checklist-row">
                    <CheckCircle2 size={17} />
                    <span>Terminology rules configured</span>
                  </div>

                  <div className="checklist-row">
                    <CheckCircle2 size={17} />
                    <span>Review rules enabled</span>
                  </div>

                  <button
                    className="secondary-button full-width"
                    onClick={() => setPage("Brand Kit")}
                  >
                    View Brand Kit <ArrowRight size={15} />
                  </button>
                </div>
              </section>
            </>
          )}

          {page === "Content review" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">CONTENT ASSURANCE</div>
                  <h1>Content review</h1>
                  <p className="subheading">
                    Check your content against the selected company's
                    guidelines.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={startNewReview}
                >
                  <RotateCcw size={16} />
                  New review
                </button>
              </div>

              <div className="review-layout">
                <section className="panel editor-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Submit your content</h3>
                      <p>Paste text or upload a PDF or image to review.</p>
                    </div>
                    <span className="step-number">01</span>
                  </div>

                  <label className="field-label" htmlFor="brandSelect">
                    Company / Brand Kit
                  </label>

                  <select
                    id="brandSelect"
                    className="select-field"
                    value={selectedBrandId}
                    onChange={handleBrandChange}
                  >
                    {Object.values(BRAND_KITS).map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <p className="brand-selection-hint">
                    <Info size={14} />
                    Review will use {brand.name}'s guidelines.
                  </p>

                  <div className="upload-section">
                    <label className="field-label" htmlFor="reviewFile">
                      Upload a file
                    </label>

                    <div className="upload-help">
                      <Upload size={18} />
                      <span>
                        PDF, PNG, JPG or JPEG · Maximum 15 MB
                      </span>
                    </div>

                    <input
                      id="reviewFile"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                      onChange={handleFileChange}
                    />

                    {uploadError && (
                      <p className="upload-error" role="alert">
                        {uploadError}
                      </p>
                    )}

                    {selectedFile && (
                      <div className="selected-file">
                        {selectedFile.type === "application/pdf" ? (
                          <File size={20} />
                        ) : (
                          <FileImage size={20} />
                        )}

                        <span>
                          <strong>{selectedFile.name}</strong>
                          <small>
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </small>
                        </span>

                        <button
                          type="button"
                          className="action-button dismiss-action"
                          onClick={removeSelectedFile}
                        >
                          <X size={14} /> Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="field-label-row">
                    <label className="field-label" htmlFor="contentInput">
                      Content to review
                    </label>
                    <span>{content.length} characters</span>
                  </div>

                  <textarea
                    id="contentInput"
                    className="content-textarea"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Or paste your marketing copy, product description, or social media post here..."
                  />

                  <div className="editor-footer">
                    <span>
                      <Info size={14} /> Text review · Demo rules
                    </span>

                    <button
                      className="text-button"
                      onClick={() => {
                        removeSelectedFile();
                        setContent(sampleContent);
                        setUploadError("");
                      }}
                    >
                      Load sample <ArrowRight size={14} />
                    </button>
                  </div>

                  <button
                    className="primary-button review-button"
                    onClick={runReview}
                    disabled={isUploading}
                  >
                    <Sparkles size={17} />
                    Review content
                    <ArrowRight size={16} />
                  </button>

                  <p className="privacy-note">
                    <ShieldCheck size={14} />
                    Demo mode: pasted text is checked locally in your browser.
                  </p>
                </section>

                <section className="panel findings-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Review findings</h3>
                      <p>
                        Issues detected using {brand.name}'s demo rules.
                      </p>
                    </div>
                    <span className="step-number">02</span>
                  </div>

                  {!reviewed ? (
                    <EmptyState
                      icon={<FileSearch />}
                      title="Ready when you are"
                      text="Submit your text to see brand and claim checks here."
                    />
                  ) : findings.length === 0 ? (
                    <div className="clean-state">
                      <CheckCircle2 size={36} />
                      <h3>No issues detected by the demo rules</h3>
                      <p>
                        This is not a guarantee that the content is fully
                        compliant. Review it before publishing.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="finding-summary">
                        <div>
                          <strong>{findings.length}</strong>
                          <span>Total findings</span>
                        </div>
                        <div>
                          <strong>{activeFindings.length}</strong>
                          <span>Open</span>
                        </div>
                        <div>
                          <strong>{resolvedCount}</strong>
                          <span>Resolved</span>
                        </div>
                      </div>

                      {findings.map((finding) => (
                        <FindingCard
                          key={finding.id}
                          finding={finding}
                          editingId={editingId}
                          editText={editText}
                          setEditText={setEditText}
                          startEdit={startEdit}
                          cancelEdit={cancelEdit}
                          saveEdit={saveEdit}
                          updateStatus={updateStatus}
                        />
                      ))}
                    </>
                  )}

                  <p className="disclaimer">
                    Prototype checks are rule-based and may miss context.
                    Human review is required.
                  </p>
                </section>
              </div>
            </>
          )}

          {page === "Brand Kit" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">BRAND SETTINGS</div>
                  <h1>Company Brand Kits</h1>
                  <p className="subheading">
                    Choose a company to view the guidelines used during
                    content review.
                  </p>
                </div>
                <span className="small-tag">
                  {Object.keys(BRAND_KITS).length} DEMO BRANDS
                </span>
              </div>

              <section className="panel brand-selector-panel">
                <label className="field-label" htmlFor="brandKitSelect">
                  Select company
                </label>

                <select
                  id="brandKitSelect"
                  className="select-field"
                  value={selectedBrandId}
                  onChange={handleBrandChange}
                >
                  {Object.values(BRAND_KITS).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <p className="muted-copy">
                  Changing the company changes the Brand Kit used for new
                  reviews. These are example guidelines for prototype testing.
                </p>
              </section>

              <section className="panel brand-profile">
                <div className="brand-profile-icon">
                  {brand.name.charAt(0)}
                </div>
                <div>
                  <h2>{brand.name}</h2>
                  <p>{brand.description}</p>
                  <span className="status-badge">
                    <CheckCircle2 size={14} />
                    Brand Kit active for this company
                  </span>
                </div>
              </section>

              <div className="brand-kit-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Approved facts</h3>
                      <p>Facts used for demo comparisons</p>
                    </div>
                    <BookOpen size={20} />
                  </div>

                  {brand.approvedFacts.map((fact, index) => (
                    <div
                      className="fact-row"
                      key={`${fact.attribute}-${index}`}
                    >
                      <div>
                        <strong>{fact.subject}</strong>
                        <span>{fact.attribute}</span>
                      </div>

                      <div className="fact-value">
                        {fact.value}
                        <small>{fact.source}</small>
                      </div>
                    </div>
                  ))}
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Terminology</h3>
                      <p>Brand-approved language</p>
                    </div>
                    <FileText size={20} />
                  </div>

                  <p className="mini-section-title">PREFERRED TERMS</p>

                  {brand.preferredTerms.map((term) => (
                    <span className="term-chip preferred" key={term}>
                      <CheckCircle2 size={13} />
                      {term}
                    </span>
                  ))}

                  <p className="mini-section-title spaced">
                    PROHIBITED TERMS
                  </p>

                  {brand.bannedTerms.map((term) => (
                    <span className="term-chip banned" key={term}>
                      <X size={13} />
                      {term}
                    </span>
                  ))}
                </section>

                <section className="panel tone-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Brand guidelines & voice</h3>
                      <p>Rules used by the prototype checker</p>
                    </div>
                    <Sparkles size={20} />
                  </div>

                  <ul className="brand-guidelines-list">
                    {brand.guidelines.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>

                  <p className="mini-section-title">DESIRED TONE</p>

                  <div className="tone-tags">
                    {brand.tone.map((tone) => (
                      <span key={tone}>{tone}</span>
                    ))}
                  </div>

                  <p className="muted-copy">
                    The checker uses these demo rules and terminology. It is
                    not a full AI-based policy engine yet.
                  </p>
                </section>
              </div>
            </>
          )}

          {page === "Review history" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR ACTIVITY</div>
                  <h1>Review history</h1>
                  <p className="subheading">
                    Review sessions stored in this browser session.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={startNewReview}
                >
                  <FileSearch size={17} />
                  Start a review
                </button>
              </div>

              <section className="panel history-panel">
                <div className="panel-heading">
                  <div>
                    <h3>All reviews</h3>
                    <p>{history.length} reviews in this session</p>
                  </div>

                  <div className="search-box">
                    <Search size={15} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search reviews..."
                    />
                  </div>
                </div>

                {filteredHistory.length === 0 ? (
                  <EmptyState
                    icon={<History />}
                    title="No matching reviews"
                    text="Try another search or start a new review."
                    action="Start a review"
                    onClick={startNewReview}
                  />
                ) : (
                  filteredHistory.map((item) => (
                    <HistoryRow
                      key={item.id}
                      item={item}
                      onOpen={openReview}
                    />
                  ))
                )}
              </section>
            </>
          )}
        </div>

        <footer className="app-footer">
          <span>
            <ShieldCheck size={15} /> BrandGuard{" "}
            <span className="footer-dot">·</span> A friendly second pair of
            eyes
          </span>

          <span>
            Prototype v0.2 <span className="footer-dot">·</span> Human review
            required
          </span>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, note, tone = "" }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-note">{note}</span>
    </div>
  );
}

function EmptyState({ icon, title, text, action, onClick }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>

      {action && (
        <button className="secondary-button" onClick={onClick}>
          {action} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function HistoryRow({ item, onOpen }) {
  return (
    <div className="history-row">
      <div className="history-icon">
        <FileText size={18} />
      </div>

      <div className="history-copy">
        <strong>{item.preview || "Content review"}</strong>
        <span>
          {item.brandName || "NovaTech"} · {item.date}
        </span>
      </div>

      <span
        className={`finding-chip ${item.count ? "has-findings" : "clean"}`}
      >
        {item.count} findings
      </span>

      <button
        className="history-open-button"
        onClick={() => onOpen(item)}
      >
        <FileSearch size={14} /> View review
      </button>
    </div>
  );
}

function FindingCard({
  finding,
  editingId,
  editText,
  setEditText,
  startEdit,
  cancelEdit,
  saveEdit,
  updateStatus
}) {
  const resolved = finding.status !== "OPEN";

  return (
    <article
      className={`finding-card ${resolved ? "finding-resolved" : ""}`}
    >
      <div className="finding-card-top">
        <span className={`severity ${finding.severity.toLowerCase()}`}>
          <AlertTriangle size={12} /> {finding.severity}
        </span>

        <span className="finding-category">{finding.category}</span>

        {resolved && (
          <span className="resolved-label">
            {finding.status === "EDITED" ? "EDITED" : "RESOLVED"}
          </span>
        )}
      </div>

      <p className="original-label">FLAGGED CONTENT</p>
      <p className="original-text">{finding.original}</p>
      <p className="finding-reason">{finding.reason}</p>

      <div className="source-line">
        <Info size={13} />
        <span>{finding.source}</span>
      </div>

      <div className="suggestion-box">
        <span className="suggestion-label">
          <Sparkles size={12} /> SUGGESTED IMPROVEMENT
        </span>

        {editingId === finding.id ? (
          <>
            <textarea
              className="edit-textarea"
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
            />

            <div className="finding-actions">
              <button
                className="action-button accept-action"
                onClick={() => saveEdit(finding.id)}
              >
                <Check size={13} /> Save edit
              </button>

              <button className="action-button" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p>{finding.suggestion}</p>
        )}
      </div>

      {editingId !== finding.id && (
        <div className="finding-actions">
          {!resolved && (
            <>
              <button
                className="action-button accept-action"
                onClick={() => updateStatus(finding.id, "RESOLVED")}
              >
                <Check size={13} /> Mark resolved
              </button>

              <button
                className="action-button"
                onClick={() => startEdit(finding)}
              >
                <Pencil size={13} /> Edit suggestion
              </button>

              <button
                className="action-button dismiss-action"
                onClick={() => updateStatus(finding.id, "DISMISSED")}
              >
                <X size={13} /> Dismiss
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

export default App;




      