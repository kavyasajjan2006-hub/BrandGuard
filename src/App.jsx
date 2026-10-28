
import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  FileSearch,
  BookOpen,
  History,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  FileText,
  X,
  Plus,
  Building2,
} from "lucide-react";

import "./App.css";
import Login from "./pages/login.jsx";
import Signup from "./pages/signup.jsx";

const API_URL = "http://localhost:5000/api";

const DEMO_SAMPLE = `Meet our daily skincare essentials!

Our hydrating face cleanser supports your daily skincare routine and helps maintain hydration.

Try our SPF 50 sunscreen as part of your daily sun protection routine.

Our products guarantee results and cure acne in three days.

Enjoy a simple routine designed for healthy-looking skin.`;

const EMPTY_BRAND_FORM = {
  name: "",
  description: "",
  industry: "",
  website: "",
  toneOfVoice: "",
  brandGuidelines: "",
  approvedFacts: "",
  approvedTerminology: "",
  prohibitedPhrases: "",
};

function normalizeBrand(item) {
  return {
    ...item,
    id: item._id,
    description: item.description || "",
    tone: [item.toneOfVoice || "Clear"],
    guidelines: item.brandGuidelines
      ? [item.brandGuidelines]
      : [],
    approvedFacts: (item.approvedFacts || []).map((fact) =>
      typeof fact === "string"
        ? {
            subject: item.name,
            attribute: "Approved fact",
            value: fact,
            source: "Brand Kit",
          }
        : fact
    ),
    preferredTerms: item.approvedTerminology || [],
    bannedTerms: item.prohibitedPhrases || [],
  };
}

function normalizeFinding(item, index) {
  return {
    id: item._id || `${Date.now()}-${index}`,
    category: item.title || "Compliance issue",
    severity: String(item.severity || "medium").toUpperCase(),
    original: item.title || "Flagged content",
    reason: item.description || "",
    suggestion:
      item.recommendation || "Review this content manually.",
    source: "Brand compliance check",
    status: String(item.status || "open").toUpperCase(),
  };
}

function normalizeReview(item) {
  const reviewBrand = item.brand;
  const reviewFindings = (item.findings || []).map(
    normalizeFinding
  );

  return {
    id: item._id,
    title: item.title || "Content review",
    content: item.description || "",
    brandId:
      typeof reviewBrand === "object"
        ? reviewBrand?._id
        : reviewBrand,
    brandName:
      typeof reviewBrand === "object"
        ? reviewBrand?.name || "Brand"
        : "Brand",
    date: item.createdAt
      ? new Date(item.createdAt).toLocaleString()
      : "",
    findings: reviewFindings,
    count: reviewFindings.length,
    overallScore:
      item.overallScore ?? item.compliance?.score ?? null,
    riskLevel:
      item.riskLevel ?? item.compliance?.riskLevel ?? "",
  };
}

function parseLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function App() {
  const [authPage, setAuthPage] = useState(() => {
  const token = localStorage.getItem("hackguard_token");
 
  const user = localStorage.getItem("hackguard_user");

  return token && user ? "dashboard" : "login";
});
  const [page, setPage] = useState("Overview");

const [realBrands, setRealBrands] = useState([]);
const [selectedBrandId, setSelectedBrandId] = useState(
  () => localStorage.getItem("brandguard_selected_brand") || ""
);
useEffect(() => {
  if (selectedBrandId) {
    localStorage.setItem("brandguard_selected_brand", selectedBrandId);
  }
}, [selectedBrandId]);
const [brandsLoading, setBrandsLoading] = useState(false);
const [brandsError, setBrandsError] = useState("");


  const [showBrandForm, setShowBrandForm] = useState(false);
  const [brandForm, setBrandForm] = useState(EMPTY_BRAND_FORM);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandFormError, setBrandFormError] = useState("");
  const [brandSuccess, setBrandSuccess] = useState("");

  const [content, setContent] = useState("");
  const [title, setTitle] = useState(
    "Content compliance review"
  );
  const [findings, setFindings] = useState([]);
const [history, setHistory] = useState([]);
const [search, setSearch] = useState("");
const [reviewed, setReviewed] = useState(false);

// NEW: Store the compliance score and risk level
const [complianceScore, setComplianceScore] = useState(null);
const [riskLevel, setRiskLevel] = useState("");

const [reviewLoading, setReviewLoading] = useState(false);
const [reviewError, setReviewError] = useState("");

const [uploadError, setUploadError] = useState("");
const [isUploading, setIsUploading] = useState(false);
const [uploadedFileName, setUploadedFileName] = useState("");

  const token = localStorage.getItem("hackguard_token");

  const brand =
    realBrands.find((item) => item._id === selectedBrandId) ||
    realBrands[0] ||
    null;

  // Load saved brand kits after login.
  useEffect(() => {
    if (authPage !== "dashboard") return;

    let cancelled = false;

    async function loadBrands() {
      setBrandsLoading(true);
      setBrandsError("");

      try {
        const savedToken =
          localStorage.getItem("hackguard_token");

        if (!savedToken) {
          throw new Error(
            "Your login session is missing. Please log in again."
          );
        }

        const response = await fetch(`${API_URL}/brands`, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load brand kits."
          );
        }

        const brands = (data.brands || []).map(normalizeBrand);

        if (!cancelled) {
          setRealBrands(brands);

setSelectedBrandId((currentId) => {
  const selectedId = brands.some(
    (item) => item._id === currentId
  )
    ? currentId
    : brands[0]?._id || "";

  if (selectedId) {
    localStorage.setItem("brandguard_selected_brand", selectedId);
  } else {
    localStorage.removeItem("brandguard_selected_brand");
  }

  return selectedId;
});

        }
      } catch (error) {
        if (!cancelled) {
          setBrandsError(
            error.message || "Could not load brand kits."
          );
        }
      } finally {
        if (!cancelled) {
          setBrandsLoading(false);
        }
      }
    }

    loadBrands();

    return () => {
      cancelled = true;
    };
  }, [authPage]);

  // Load previously saved reviews.
  async function loadHistory() {
    const savedToken =
      localStorage.getItem("hackguard_token");

    if (!savedToken) return;

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load review history."
        );
      }

      const reviews =
        data.reviews || data.data?.reviews || [];

      setHistory(reviews.map(normalizeReview));
    } catch (error) {
      setReviewError(
        error.message || "Could not load review history."
      );
    }
  }

  useEffect(() => {
    if (authPage === "dashboard" && token) {
      loadHistory();
    }
  }, [authPage,token]);

  // Update a field in the Create Brand Kit form.
  function handleBrandFormChange(event) {
    const { name, value } = event.target;

    setBrandForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setBrandFormError("");
    setBrandSuccess("");
  }

  // Open a fresh brand creation form.
  function openBrandForm() {
    setBrandForm(EMPTY_BRAND_FORM);
    setBrandFormError("");
    setBrandSuccess("");
    setShowBrandForm(true);
    setPage("Brand Kit");
  }

  // Save a new brand kit to the backend.
  async function createBrand(event) {
    event.preventDefault();

    const savedToken =
      localStorage.getItem("hackguard_token");

    setBrandFormError("");
    setBrandSuccess("");

    if (!savedToken) {
      setBrandFormError(
        "Your login session is missing. Please log in again."
      );
      setAuthPage("login");
      return;
    }

    if (!brandForm.name.trim()) {
      setBrandFormError("Company name is required.");
      return;
    }

    setBrandSaving(true);

    try {
      const payload = {
        name: brandForm.name.trim(),
        description: brandForm.description.trim(),
        industry: brandForm.industry.trim(),
        website: brandForm.website.trim(),
        toneOfVoice: brandForm.toneOfVoice.trim(),
        brandGuidelines: brandForm.brandGuidelines.trim(),
        approvedFacts: parseLines(brandForm.approvedFacts),
        approvedTerminology: parseLines(
          brandForm.approvedTerminology
        ),
        prohibitedPhrases: parseLines(
          brandForm.prohibitedPhrases
        ),
      };

      const response = await fetch(`${API_URL}/brands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${savedToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not create the brand kit."
        );
      }

      const createdBrand =
        data.brand || data.data?.brand;

      if (!createdBrand?._id) {
        throw new Error(
          "The server did not return the saved brand. Please refresh and check your brand kits."
        );
      }

      const normalized = normalizeBrand(createdBrand);

      setRealBrands((previous) => [
        normalized,
        ...previous.filter(
          (item) => item._id !== normalized._id
        ),
      ]);

      setSelectedBrandId(normalized._id);
      setBrandForm(EMPTY_BRAND_FORM);
      setShowBrandForm(false);
      setBrandSuccess(
        `Brand kit "${normalized.name}" created successfully.`
      );
      setBrandsError("");
    } catch (error) {
      setBrandFormError(
        error.message || "Could not create the brand kit."
      );
    } finally {
      setBrandSaving(false);
    }
  }

  // Restore demo sample content.
  function useDemoSample() {
    setTitle("Demo Skincare Campaign");
    setContent(DEMO_SAMPLE);
    setUploadedFileName("");
    setFindings([]);
    setReviewed(false);
    setReviewError("");
    setUploadError("");
  }

  // Read supported text files into the editor.
  async function handleFileUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadError("");
    setReviewError("");
    setIsUploading(true);

    try {
      const extension =
        file.name.split(".").pop()?.toLowerCase();

      const supportedExtensions = ["txt", "md", "csv"];

      if (!supportedExtensions.includes(extension)) {
        throw new Error(
          "Please upload a TXT, MD, or CSV file. PDF, DOCX, and image text extraction are not currently supported."
        );
      }

      const text = await file.text();

      if (!text.trim()) {
        throw new Error("The selected file is empty.");
      }

      setTitle(file.name);
      setContent(text);
      setUploadedFileName(file.name);
      setFindings([]);
      setReviewed(false);
    } catch (error) {
      setUploadError(
        error.message || "Could not read the selected file."
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function clearUploadedFile() {
    setUploadedFileName("");
    setContent("");
    setFindings([]);
    setReviewed(false);
    setUploadError("");
    setReviewError("");
    setComplianceScore(null);
    setRiskLevel("");
  }

  // Submit the editor content for review.
  async function runReview() {
    const savedToken =
      localStorage.getItem("hackguard_token");

    setReviewError("");
    setUploadError("");

    if (!savedToken) {
      setReviewError(
        "Your login session is missing. Please log in again."
      );
      setAuthPage("login");
      return;
    }

    if (!brand) {
      setReviewError(
        "No brand kit is available. Create a brand kit first."
      );
      return;
    }

    if (!content.trim()) {
      setReviewError(
        "Please upload a file, use the demo sample, or enter content."
      );
      return;
    }

    setReviewLoading(true);

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${savedToken}`,
        },
        body: JSON.stringify({
          brandId: brand._id,
          title: title.trim() || "Content compliance review",
          description: content.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Review creation failed."
        );
      }

      const createdReview =
        data.review ||
        data.data?.review ||
        data.data;

      if (!createdReview || !createdReview._id) {
        throw new Error(
          "The review could not be loaded. Please try again."
        );
      }

      const review = normalizeReview({
        ...createdReview,
        brand: createdReview.brand || brand,
        description:
          createdReview.description || content.trim(),
        title:
          createdReview.title ||
          title ||
          "Content compliance review",
      });

      review.brandId = brand._id;
      review.brandName = brand.name;

      setFindings(review.findings);
      setComplianceScore(review.overallScore);
      setRiskLevel(review.riskLevel);

      setHistory((old) => [
        review,
        ...old.filter((item) => item.id !== review.id),
      ]);
      setReviewed(true);
      setPage("Content review");
    } catch (error) {
      setReviewError(
        error.message || "Could not create the review."
      );
    } finally {
      setReviewLoading(false);
    }
  }

  // Update a finding's status.
  async function changeFindingStatus(findingId, status) {
    const review = history.find((item) =>
      item.findings.some(
        (finding) => finding.id === findingId
      )
    );

    if (!review) {
      setReviewError(
        "Review not found. Refresh the review history."
      );
      return;
    }

    const savedToken =
      localStorage.getItem("hackguard_token");

    if (!savedToken) {
      setReviewError("Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/reviews/${review.id}/findings/${findingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${savedToken}`,
          },
          body: JSON.stringify({
            status: status.toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not update the finding."
        );
      }

      setFindings((old) =>
        old.map((item) =>
          item.id === findingId
            ? { ...item, status: status.toUpperCase() }
            : item
        )
      );

      setHistory((old) =>
        old.map((item) =>
          item.id === review.id
            ? {
                ...item,
                findings: item.findings.map((finding) =>
                  finding.id === findingId
                    ? {
                        ...finding,
                        status: status.toUpperCase(),
                      }
                    : finding
                ),
              }
            : item
        )
      );

      setReviewError("");
    } catch (error) {
      setReviewError(
        error.message || "Could not update the finding."
      );
    }
  }

  function openReview(review) {
    setTitle(review.title || "Content compliance review");
    setContent(review.content || "");
    setFindings(review.findings || []);
    setSelectedBrandId(review.brandId || "");
    setUploadedFileName("");
    setReviewed(true);
    setReviewError("");
    setUploadError("");
    setPage("Content review");
  }

  function startNewReview() {
    setTitle("Content compliance review");
    setContent("");
    setFindings([]);
    setReviewed(false);
    setReviewError("");
    setUploadError("");
    setUploadedFileName("");
    setPage("Content review");
  }

  function logout() {
    localStorage.removeItem("hackguard_token");
    localStorage.removeItem("hackguard_user");

    setRealBrands([]);
    setSelectedBrandId("");
    setHistory([]);
    setFindings([]);
    setContent("");
    setUploadedFileName("");
    setReviewed(false);
    setReviewError("");
    setUploadError("");
    setShowBrandForm(false);
    setBrandForm(EMPTY_BRAND_FORM);
    setBrandSuccess("");
    setBrandFormError("");
    setAuthPage("login");
  }

  if (authPage === "login") {
    return (
      <Login
        onNavigate={setAuthPage}
        onSubmit={() => setAuthPage("dashboard")}
      />
    );
  }

  if (authPage === "signup") {
    return (
      <Signup
        onNavigate={setAuthPage}
        onSubmit={() => setAuthPage("login")}
      />
    );
  }

  const activeFindings = findings.filter(
    (item) => item.status === "OPEN"
  );

  const filteredHistory = history.filter((item) =>
    `${item.title} ${item.content} ${item.brandName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const navItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Content review", icon: FileSearch },
    { name: "Brand Kit", icon: BookOpen },
    { name: "Review history", icon: History },
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
            <div className="brand-caption">
              CONTENT ASSURANCE
            </div>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <div className="workspace-switch">
          <div className="workspace-avatar">
            {brand?.name?.charAt(0) || "B"}
          </div>

          <div className="workspace-text">
            <strong>{brand?.name || "Your workspace"}</strong>
            <span>Selected company</span>
          </div>
        </div>

        <div className="nav-label">MENU</div>

        <nav className="navigation">
          {navItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${
                page === name ? "active" : ""
              }`}
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
            <p>
              Catch issues before your content goes live.
            </p>
          </div>

          <button className="nav-item" onClick={logout}>
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <strong>{page}</strong>
          </div>
        </header>

        <div className="page-content">
          {brandsLoading && <p>Loading your brand kits…</p>}

          {brandsError && (
            <div role="alert" className="upload-error">
              {brandsError}

              <button
                className="secondary-button"
                onClick={() => setAuthPage("login")}
              >
                Log in again
              </button>
            </div>
          )}

          {brandSuccess && (
            <div
              role="status"
              style={{
                margin: "12px 0",
                padding: "12px 16px",
                border: "1px solid #a7dfbd",
                borderRadius: "8px",
                color: "#17683a",
                background: "#effbf3",
              }}
            >
              <CheckCircle2
                size={17}
                style={{
                  verticalAlign: "middle",
                  marginRight: "8px",
                }}
              />
              {brandSuccess}
            </div>
          )}

          {!brandsLoading &&
            !brandsError &&
            realBrands.length === 0 && (
              <section className="panel">
                <h2>No brand kits found</h2>
                <p>
                  Create your first brand kit before starting a
                  content review.
                </p>
                <button
                  className="primary-button"
                  onClick={openBrandForm}
                >
                  <Plus size={17} />
                  Create your first Brand Kit
                </button>
              </section>
            )}

          {reviewError && (
            <div role="alert" className="upload-error">
              {reviewError}
            </div>
          )}

          {page === "Overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    YOUR CONTENT, WITH CONFIDENCE
                  </div>
                  <h1>Good morning, reviewer</h1>
                  <p className="subheading">
                    Review content against your saved brand rules.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={startNewReview}
                  disabled={!brand}
                >
                  <FileSearch size={17} />
                  Start a review
                </button>
              </div>

              <section className="panel">
                <h2>Recent reviews</h2>

                {history.length === 0 ? (
                  <div className="empty-state">
                    <div className="history-icon">
                      <FileSearch size={22} />
                    </div>
                    <h3>Your reviews will appear here</h3>
                    <p>
                      Start a content review to check your copy
                      against your brand guidelines.
                    </p>
                    <button
                      className="primary-button"
                      onClick={startNewReview}
                      disabled={!brand}
                    >
                      <Sparkles size={16} />
                      Start your first review
                    </button>
                  </div>
                ) : (
                  history.slice(0, 5).map((item) => (
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

          {page === "Content review" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    CONTENT ASSURANCE
                  </div>
                  <h1>Content review</h1>
                  <p className="subheading">
                    Upload a supported text file, use a demo
                    sample, or paste content to review it against
                    your brand rules.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={startNewReview}
                >
                  <RefreshCw size={16} />
                  New review
                </button>
              </div>

              {!brand && (
                <section className="panel">
                  <p>Create a brand kit before reviewing content.</p>
                  <button
                    className="primary-button"
                    onClick={openBrandForm}
                  >
                    <Plus size={17} />
                    Create Brand Kit
                  </button>
                </section>
              )}

              <section className="panel editor-panel">
                <label
                  className="field-label"
                  htmlFor="reviewTitle"
                >
                  Review title
                </label>

                <input
                  id="reviewTitle"
                  className="select-field"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                />

                <label
                  className="field-label"
                  htmlFor="brandSelect"
                >
                  Brand Kit
                </label>

                <select
                  id="brandSelect"
                  className="select-field"
                  value={brand?._id || ""}
                  onChange={(event) =>
                    setSelectedBrandId(event.target.value)
                  }
                  disabled={!realBrands.length}
                >
                  {realBrands.map((item) => (
                    <option
                      value={item._id}
                      key={item._id}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>

                <label
                  className="field-label"
                  htmlFor="contentInput"
                >
                  Content to review
                </label>

                <div
                  className="upload-actions"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    margin: "12px 0 16px",
                  }}
                >
                  <label
                    className="secondary-button upload-button"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: isUploading ? "wait" : "pointer",
                    }}
                  >
                    <Upload size={16} />
                    {isUploading ? "Reading file..." : "Upload File"}
                    <input
                      type="file"
                      accept=".txt,.csv,.md"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      hidden
                    />
                  </label>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={useDemoSample}
                  >
                    <Sparkles size={16} />
                    Use Demo Sample
                  </button>

                  {content && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={clearUploadedFile}
                    >
                      <X size={16} />
                      Clear content
                    </button>
                  )}
                </div>

                {uploadedFileName && (
                  <div
                    className="uploaded-file"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <FileText size={17} />
                    <span>
                      Loaded file:{" "}
                      <strong>{uploadedFileName}</strong>
                    </span>
                  </div>
                )}

                {uploadError && (
                  <div
                    className="upload-error"
                    role="alert"
                    style={{
                      margin: "12px 0",
                      padding: "12px",
                      border: "1px solid #f0b5b5",
                      borderRadius: "8px",
                      color: "#a12626",
                      background: "#fff5f5",
                    }}
                  >
                    {uploadError}
                  </div>
                )}

                <textarea
                  id="contentInput"
                  className="content-textarea"
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    setUploadedFileName("");
                  }}
                  placeholder="Upload a supported text file, use the demo sample, or paste your marketing copy here..."
                />

                <p>{content.length} characters</p>

                <button
                  className="primary-button review-button"
                  onClick={runReview}
                  disabled={reviewLoading || !brand}
                >
                  <Sparkles size={17} />
                  {reviewLoading ? "Reviewing..." : "Review content"}
                </button>

                <p className="privacy-note">
                  Check your content against your selected brand
                  guidelines before publishing.
                </p>
                <p className="privacy-note">
                  Supported file formats: TXT, MD, and CSV.
                </p>
              </section>

            

                   
<section className="panel findings-panel">
  {reviewed && (
    <div className="score-summary">
      <div>
        <p>Compliance score</p>
        <h2>
          {complianceScore !== null
            ? `${complianceScore}/100`
            : "Score unavailable"}
        </h2>
      </div>

      <div>
        <p>Risk level</p>
        <h3>
          {riskLevel
            ? riskLevel.replace(/_/g, " ")
            : "Unavailable"}
        </h3>
      </div>

      <div>
        <p>Findings detected</p>
        <h3>{findings.length}</h3>
      </div>
    </div>
  )}

  <h2>Review findings</h2>

  {!reviewed ? (
    <p>
      Upload a supported text file, load the demo
      sample, or enter content and click Review
      content.
    </p>
  ) : findings.length === 0 ? (
    <p>
      No findings were returned. Human review is
      still recommended before publishing.
    </p>
  ) : (
    findings.map((item) => (
      <article
        className="finding-card"
        key={item.id}
      >
        <div className="finding-card-top">
          <span
            className={`severity ${item.severity.toLowerCase()}`}
          >
            <AlertTriangle size={12} />
            {item.severity}
          </span>
          <strong>{item.category}</strong>
        </div>

        <p>
          <strong>Issue:</strong>{" "}
          {item.reason || item.original}
        </p>

        <p>
          <strong>Suggested improvement:</strong>{" "}
          {item.suggestion}
        </p>

        <p>
          <small>{item.source}</small>
        </p>

        {item.status === "OPEN" && (
          <button
            className="secondary-button"
            onClick={() =>
              changeFindingStatus(item.id, "RESOLVED")
            }
          >
            <CheckCircle2 size={15} />
            Mark resolved
          </button>
        )}

        {item.status !== "OPEN" && <p>Resolved</p>}
      </article>
    ))
  )}
</section>


            </>
          )}

          {page === "Brand Kit" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">BRAND SETTINGS</div>
                  <h1>Company Brand Kits</h1>
                  <p className="subheading">
                    Create and manage your company information,
                    guidelines, and approved language.
                  </p>
                </div>

                {!showBrandForm && (
                  <button
                    className="primary-button"
                    onClick={openBrandForm}
                  >
                    <Plus size={17} />
                    Create Brand Kit
                  </button>
                )}
              </div>

              {showBrandForm && (
                <section className="panel">
                  <div className="page-heading">
                    <div>
                      <h2>Create a new Brand Kit</h2>
                      <p className="subheading">
                        Add your company details and content rules.
                        Only the company name is required.
                      </p>
                    </div>
                  </div>

                  {brandFormError && (
                    <div
                      className="upload-error"
                      role="alert"
                      style={{ marginBottom: "16px" }}
                    >
                      {brandFormError}
                    </div>
                  )}

                  <form onSubmit={createBrand}>
                    <label className="field-label" htmlFor="brandName">
                      Company name *
                    </label>
                    <input
                      id="brandName"
                      name="name"
                      className="select-field"
                      value={brandForm.name}
                      onChange={handleBrandFormChange}
                      placeholder="e.g. Acme Skincare"
                      required
                    />

                    <label
                      className="field-label"
                      htmlFor="brandDescription"
                    >
                      Company description
                    </label>
                    <textarea
                      id="brandDescription"
                      name="description"
                      className="content-textarea"
                      value={brandForm.description}
                      onChange={handleBrandFormChange}
                      placeholder="What does your company do?"
                      rows={3}
                    />

                    <label
                      className="field-label"
                      htmlFor="brandIndustry"
                    >
                      Industry
                    </label>
                    <input
                      id="brandIndustry"
                      name="industry"
                      className="select-field"
                      value={brandForm.industry}
                      onChange={handleBrandFormChange}
                      placeholder="e.g. Skincare, Technology, Healthcare"
                    />

                    <label
                      className="field-label"
                      htmlFor="brandWebsite"
                    >
                      Website
                    </label>
                    <input
                      id="brandWebsite"
                      name="website"
                      type="url"
                      className="select-field"
                      value={brandForm.website}
                      onChange={handleBrandFormChange}
                      placeholder="https://example.com"
                    />

                    <label
                      className="field-label"
                      htmlFor="brandTone"
                    >
                      Tone of voice
                    </label>
                    <input
                      id="brandTone"
                      name="toneOfVoice"
                      className="select-field"
                      value={brandForm.toneOfVoice}
                      onChange={handleBrandFormChange}
                      placeholder="e.g. Friendly, professional, confident"
                    />

                    <label
                      className="field-label"
                      htmlFor="brandGuidelines"
                    >
                      Brand guidelines
                    </label>
                    <textarea
                      id="brandGuidelines"
                      name="brandGuidelines"
                      className="content-textarea"
                      value={brandForm.brandGuidelines}
                      onChange={handleBrandFormChange}
                      placeholder="Describe your brand's writing rules and messaging requirements."
                      rows={4}
                    />

                    <label
                      className="field-label"
                      htmlFor="approvedFacts"
                    >
                      Approved facts
                    </label>
                    <textarea
                      id="approvedFacts"
                      name="approvedFacts"
                      className="content-textarea"
                      value={brandForm.approvedFacts}
                      onChange={handleBrandFormChange}
                      placeholder={"Enter one approved fact per line.\nExample: Founded in 2020"}
                      rows={4}
                    />

                    <label
                      className="field-label"
                      htmlFor="approvedTerminology"
                    >
                      Approved terminology
                    </label>
                    <textarea
                      id="approvedTerminology"
                      name="approvedTerminology"
                      className="content-textarea"
                      value={brandForm.approvedTerminology}
                      onChange={handleBrandFormChange}
                      placeholder={"Enter one preferred term per line.\nExample: Customers"}
                      rows={3}
                    />

                    <label
                      className="field-label"
                      htmlFor="prohibitedPhrases"
                    >
                      Prohibited phrases
                    </label>
                    <textarea
                      id="prohibitedPhrases"
                      name="prohibitedPhrases"
                      className="content-textarea"
                      value={brandForm.prohibitedPhrases}
                      onChange={handleBrandFormChange}
                      placeholder={"Enter one prohibited phrase per line.\nExample: Guaranteed results"}
                      rows={3}
                    />

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginTop: "20px",
                      }}
                    >
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={brandSaving}
                      >
                        <Building2 size={17} />
                        {brandSaving
                          ? "Saving Brand Kit..."
                          : "Save Brand Kit"}
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        disabled={brandSaving}
                        onClick={() => {
                          setShowBrandForm(false);
                          setBrandForm(EMPTY_BRAND_FORM);
                          setBrandFormError("");
                        }}
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {!showBrandForm && brand && (
                <section className="panel">
                  <label
                    className="field-label"
                    htmlFor="brandKitSelect"
                  >
                    Select company
                  </label>

                  <select
                    id="brandKitSelect"
                    className="select-field"
                    value={brand._id}
                    onChange={(event) =>
                      setSelectedBrandId(event.target.value)
                    }
                  >
                    {realBrands.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <h2>{brand.name}</h2>
                  <p>{brand.description || "No description added."}</p>

                  <h3>Industry</h3>
                  <p>{brand.industry || "Not specified"}</p>

                  <h3>Website</h3>
                  <p>{brand.website || "Not specified"}</p>

                  <h3>Tone of voice</h3>
                  <p>{brand.toneOfVoice || "Not specified"}</p>

                  <h3>Brand guidelines</h3>
                  <p>
                    {brand.brandGuidelines || "No guidelines added."}
                  </p>

                  <h3>Approved facts</h3>
                  {(brand.approvedFacts || []).length ? (
                    <ul>
                      {brand.approvedFacts.map((fact, index) => (
                        <li key={index}>
                          {typeof fact === "string" ? fact : fact.value}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No approved facts added.</p>
                  )}

                  <h3>Approved terminology</h3>
                  {(brand.approvedTerminology || []).length ? (
                    <ul>
                      {brand.approvedTerminology.map((term) => (
                        <li key={term}>{term}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No approved terminology added.</p>
                  )}

                  <h3>Prohibited phrases</h3>
                  {(brand.prohibitedPhrases || []).length ? (
                    <ul>
                      {brand.prohibitedPhrases.map((term) => (
                        <li key={term}>{term}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No prohibited phrases added.</p>
                  )}
                </section>
              )}

              {!showBrandForm && !brand && (
                <section className="panel empty-state">
                  <Building2 size={32} />
                  <h2>Your first Brand Kit starts here</h2>
                  <p>
                    Add your company details and guidelines to start
                    reviewing content.
                  </p>
                  <button
                    className="primary-button"
                    onClick={openBrandForm}
                  >
                    <Plus size={17} />
                    Create Brand Kit
                  </button>
                </section>
              )}
            </>
          )}

          {page === "Review history" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR ACTIVITY</div>
                  <h1>Review history</h1>
                  <p className="subheading">
                    Find and revisit your previous content reviews.
                  </p>
                </div>

                <div className="search-box">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search reviews..."
                  />
                </div>
              </div>

              <section className="panel history-panel">
                {filteredHistory.length === 0 ? (
                  <p>No matching reviews found.</p>
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
            <ShieldCheck size={15} />
            BrandGuard · Human review recommended
          </span>
        </footer>
      </main>
    </div>
  );
}

function HistoryRow({ item, onOpen }) {
  return (
    <div className="history-row">
      <div className="history-icon">
        <History size={18} />
      </div>

      <div className="history-copy">
        <strong>
          {item.title ||
            item.content?.slice(0, 55) ||
            "Content review"}
        </strong>
        <span>
          {item.brandName} · {item.date}
        </span>
      </div>

      <span
        className={`finding-chip ${
          item.count ? "has-findings" : "clean"
        }`}
      >
        {item.count} findings
      </span>

      <button
        className="history-open-button"
        onClick={() => onOpen(item)}
      >
        Open review
      </button>
    </div>
  );
}

export default App;
