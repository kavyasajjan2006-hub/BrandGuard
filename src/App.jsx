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

const API_URL = "https://invisible-peace-revision-opportunities.trycloudflare.com/api";
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

function deduplicateBrands(brands) {
  const seenNames = new Set();

  return brands.filter((item) => {
    const normalizedName = String(item.name || "")
      .trim()
      .toLowerCase();

    if (!normalizedName || seenNames.has(normalizedName)) {
      return false;
    }

    seenNames.add(normalizedName);
    return true;
  });
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
  

async function downloadComplianceReport(reviewId) {
  const token = localStorage.getItem("hackguard_token");

  setReviewError("");

  if (!token) {
    setReviewError("Please log in again.");
    setAuthPage("login");
    return;
  }

  if (!reviewId) {
    setReviewError("Review ID is missing. Check the history item ID.");
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/reviews/${reviewId}/report/pdf`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const errorText = await response.text();
      let message = errorText;

      try {
        const errorData = JSON.parse(errorText);
        message = errorData.message || errorData.error || errorText;
      } catch {
        // Keep the original error text.
      }

      throw new Error(
        `Download failed (${response.status}): ${message}`
      );
    }

    if (!contentType.includes("application/pdf")) {
      const responseText = await response.text();
      throw new Error(
        `The server did not return a PDF. Response: ${responseText.slice(0, 200)}`
      );
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `BrandGuard-Report-${reviewId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Give the browser time to start downloading.
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    console.error("PDF download error:", error);
    setReviewError(error.message || "Report download failed.");
  }
}


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
      localStorage.setItem(
        "brandguard_selected_brand",
        selectedBrandId
      );
    }
  }, [selectedBrandId]);

  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
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
  const [editingFindingId, setEditingFindingId] = useState(null);
const [editedSuggestion, setEditedSuggestion] = useState("");

  const [search, setSearch] = useState("");
  const [reviewed, setReviewed] = useState(false);

  const [complianceScore, setComplianceScore] = useState(null);
  const [complianceAnalysis, setComplianceAnalysis] = useState(null);
  const [complianceSummary, setComplianceSummary] = useState("");
  const [complianceCounts, setComplianceCounts] = useState({});
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

        const brands = deduplicateBrands(
          (data.brands || []).map(normalizeBrand)
        );

        if (!cancelled) {
          setRealBrands(brands);

          setSelectedBrandId((currentId) => {
            const selectedId = brands.some(
              (item) => item._id === currentId
            )
              ? currentId
              : brands[0]?._id || "";

            if (selectedId) {
              localStorage.setItem(
                "brandguard_selected_brand",
                selectedId
              );
            } else {
              localStorage.removeItem(
                "brandguard_selected_brand"
              );
            }

            return selectedId;
          });
        }
      } catch (error) {
        if (!cancelled) {
          setBrandsError(error.message);
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
  }, [authPage, token]);

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

      setRealBrands((previous) =>
        deduplicateBrands([
          normalized,
          ...previous.filter(
            (item) =>
              item._id !== normalized._id &&
              item.name?.trim().toLowerCase() !==
                normalized.name?.trim().toLowerCase()
          ),
        ])
      );

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
    setComplianceAnalysis(null);
    setComplianceSummary("");
    setComplianceCounts({});
    setRiskLevel("");
  }

  // Submit content and display the backend compliance analysis.
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
        "Enter some content or upload a supported text file first."
      );
      return;
    }

    setIsReviewing(true);
    setReviewed(false);
    setFindings([]);
    setComplianceScore(null);
    setComplianceAnalysis(null);
    setComplianceSummary("");
    setComplianceCounts({});
    setRiskLevel("");

    try {
      const response = await fetch(
        `${API_URL}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${savedToken}`,
          },
          body: JSON.stringify({
            title: title.trim() || "Untitled Review",
            content: content.trim(),
            brandId: brand._id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "The content review failed."
        );
      }

      const savedReview =
        data.review ||
        data.data?.review ||
        data;

      const compliance =
        data.compliance ||
        data.data?.compliance ||
        savedReview.compliance ||
        {};

      const normalizedReview = normalizeReview({
        ...savedReview,
        ...compliance,
        findings:
          compliance.findings ||
          compliance.issues ||
          savedReview.findings ||
          savedReview.issues ||
          [],
      });

      const reviewFindings =
        normalizedReview.findings || [];

      setFindings(reviewFindings);

      const score =
        compliance.score ??
        compliance.complianceScore ??
        savedReview.complianceScore ??
        savedReview.overallScore ??
        null;

      setComplianceScore(
        score === null ? null : Number(score)
      );

      setRiskLevel(
        compliance.riskLevel ||
        savedReview.riskLevel ||
        ""
      );

      setComplianceSummary(
        compliance.summary ||
        compliance.reviewSummary ||
        savedReview.reviewSummary ||
        ""
      );

      setComplianceCounts(
        compliance.counts ||
        compliance.findingCounts ||
        savedReview.findingCounts ||
        {}
      );

      setComplianceAnalysis(compliance);
      setReviewed(true);

      await loadHistory();
    } catch (error) {
      setReviewError(
        error.message || "Could not complete the review."
      );
    } finally {
      setIsReviewing(false);
    }
  }

  // Update a finding's status and refresh the compliance score.
  async function changeFindingStatus(findingId, status) {
    const review = history.find((item) =>
      item.findings?.some(
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
      setAuthPage("login");
      return;
    }

    try {
      setReviewError("");

      const normalizedStatus = status.toUpperCase();

      const response = await fetch(
        `${API_URL}/reviews/${review.id}/findings/${findingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${savedToken}`,
          },
          body: JSON.stringify({
            status: normalizedStatus.toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not update the finding."
        );
      }

      const updateFinding = (finding) =>
        finding.id === findingId
          ? { ...finding, status: normalizedStatus }
          : finding;

      setFindings((previous) =>
        previous.map(updateFinding)
      );

      setHistory((previous) =>
        previous.map((item) =>
          item.id === review.id
            ? {
                ...item,
                findings: item.findings.map(updateFinding),
              }
            : item
        )
      );

      // Refresh the score after the status changes.
      const scoreResponse = await fetch(
        `${API_URL}/reviews/${review.id}/score`,
        {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        }
      );

      const scoreData = await scoreResponse.json();

      if (!scoreResponse.ok) {
        throw new Error(
          scoreData.message ||
            "The status changed, but the score could not be refreshed."
        );
      }

      if (scoreData.success) {
        const updatedScore = Number(scoreData.score);

        setComplianceScore(updatedScore);
        setRiskLevel(scoreData.riskLevel || "");

        setHistory((previous) =>
          previous.map((item) =>
            item.id === review.id
              ? {
                  ...item,
                  overallScore: updatedScore,
                  riskLevel: scoreData.riskLevel || item.riskLevel,
                }
              : item
          )
        );
      }

      // Refresh the review history from the server.
      await loadHistory();
    } catch (error) {
      setReviewError(
        error.message || "Could not update the finding."
      );
    }
  }


async function updateFindingSuggestion(findingId, suggestion) {
  const normalizedFindingId = String(findingId);
  const updatedSuggestion = suggestion.trim();

  if (!updatedSuggestion) {
    setReviewError("Suggestion cannot be empty.");
    return false;
  }

  const review = history.find((item) =>
    item.findings?.some(
      (finding) => String(finding.id) === normalizedFindingId
    )
  );

  if (!review) {
    setReviewError("Review not found. Refresh the review history.");
    return false;
  }

  const savedToken = localStorage.getItem("hackguard_token");

  if (!savedToken) {
    setReviewError("Please log in again.");
    setAuthPage("login");
    return false;
  }

  try {
    setReviewError("");

    const response = await fetch(
      `${API_URL}/reviews/${review.id}/findings/${normalizedFindingId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${savedToken}`,
        },
        body: JSON.stringify({
          recommendation: updatedSuggestion,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Could not save the suggested fix."
      );
    }

    const savedRecommendation =
      data.finding?.recommendation ?? updatedSuggestion;

    const updateFinding = (finding) =>
      String(finding.id) === normalizedFindingId
        ? { ...finding, suggestion: savedRecommendation }
        : finding;

    setFindings((previous) =>
      previous.map(updateFinding)
    );

    setHistory((previous) =>
      previous.map((item) =>
        String(item.id) === String(review.id)
          ? {
              ...item,
              findings: item.findings.map(updateFinding),
            }
          : item
      )
    );

    await loadHistory();

    return true;
  } catch (error) {
    console.error("Saving suggestion failed:", error);
    setReviewError(
      error.message || "Could not save the suggested fix."
    );
    return false;
  }
}


  // Open an existing review from the history page.
  function openReview(review) {
    setTitle(review.title || "Content compliance review");
    setContent(review.content || "");
    setFindings(review.findings || []);
    setSelectedBrandId(review.brandId || "");
    setUploadedFileName("");
    setReviewed(true);

    setComplianceScore(
      review.overallScore ??
        review.complianceScore ??
        null
    );

    setRiskLevel(review.riskLevel || "");

    setComplianceSummary(
      review.complianceSummary ||
        review.reviewSummary ||
        ""
    );

    setComplianceCounts(
      review.complianceCounts ||
        review.findingCounts ||
        {}
    );

    setReviewError("");
    setUploadError("");
    setPage("Content review");
  }

  // Start a clean review without deleting saved reviews.
  function startNewReview() {
    setTitle("Content compliance review");
    setContent("");
    setFindings([]);
    setReviewed(false);
    setComplianceScore(null);
    setComplianceAnalysis(null);
    setComplianceSummary("");
    setComplianceCounts({});
    setRiskLevel("");
    setReviewError("");
    setUploadError("");
    setUploadedFileName("");
    setPage("Content review");
  }

  // Log out and clear session-specific information.
  function logout() {
    localStorage.removeItem("hackguard_token");
    localStorage.removeItem("hackguard_user");
    localStorage.removeItem("brandguard_selected_brand");

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
    setComplianceScore(null);
    setComplianceAnalysis(null);
    setComplianceSummary("");
    setComplianceCounts({});
    setRiskLevel("");
    setAuthPage("login");
  }

  // Show the login page when the user is logged out.
  if (authPage === "login") {
    return (
      <Login
        onNavigate={setAuthPage}
        onSubmit={() => setAuthPage("dashboard")}
      />
    );
  }

  // Show the registration page.
  if (authPage === "signup") {
    return (
      <Signup
        onNavigate={setAuthPage}
        onSubmit={() => setAuthPage("login")}
      />
    );
  }

  // Count findings that still need attention.
  const activeFindings = findings.filter(
    (item) =>
      String(item.status || "OPEN").toUpperCase() === "OPEN"
  );

  const totalFindings = findings.length;

  const unresolvedFindings = findings.filter((item) => {
    const status = String(item.status || "OPEN").toUpperCase();

    return status !== "RESOLVED" && status !== "ACCEPTED";
  }).length;

  // Filter the saved reviews using the search field.
  const filteredHistory = history.filter((item) =>
    `${item.title || ""} ${item.content || ""} ${item.brandName || ""}`
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
                      key={item.id || item.id}
                      item={item}
                      onOpen={openReview}
                      onDownload={downloadComplianceReport}
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
                  <p>
                    Create a brand kit before reviewing content.
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
                    {isUploading
                      ? "Reading file..."
                      : "Upload File"}

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
                  disabled={isReviewing || !brand}
                >
                  <Sparkles size={17} />
                  {isReviewing
                    ? "Reviewing..."
                    : "Review content"}
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
                      <p>Total findings</p>
                      <h3>{totalFindings}</h3>
                    </div>

                    <div>
                      <p>Unresolved findings</p>
                      <h3>{unresolvedFindings}</h3>
                    </div>
                  </div>
                )}

                {reviewed && (
                  <div
                    className="compliance-details"
                    style={{
                      margin: "18px 0",
                      padding: "16px",
                      border: "1px solid #e3e5ef",
                      borderRadius: "12px",
                    }}
                  >
                    <h3>
                      <Sparkles
                        size={18}
                        style={{
                          verticalAlign: "middle",
                          marginRight: "6px",
                        }}
                      />
                      Automated compliance analysis
                    </h3>

                    <p>
                      {complianceSummary ||
                        "Analysis completed. Review the findings before publishing."}
                    </p>

                    {Object.keys(complianceCounts || {}).length >
                      0 && (
                      <div
                        className="compliance-counts"
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "10px",
                          marginTop: "12px",
                        }}
                      >
                        {Object.entries(complianceCounts).map(
                          ([category, count]) => (
                            <div
                              className="compliance-count-item"
                              key={category}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                background: "#f5f5fb",
                              }}
                            >
                              <span>
                                {String(category).replace(/_/g, " ")}:{" "}
                              </span>
                              <strong>{count}</strong>
                            </div>
                          )
                        )}
                      </div>
                    )}
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
                          className={`severity ${
                            String(item.severity || "medium").toLowerCase()
                          }`}
                        >
                          <AlertTriangle size={12} />
                          {item.severity || "MEDIUM"}
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
                      {reviewError && (
  <p style={{ color: "red" }}>{reviewError}</p>
)}
                      <button
  type="button"
  onClick={() => {
    setEditingFindingId(item.id);
    setEditedSuggestion(item.suggestion || "");
  }}
>
  Edit suggestion
</button>

{editingFindingId === item.id && (
  <div className="suggestion-editor">
    <textarea
      value={editedSuggestion}
      onChange={(event) => setEditedSuggestion(event.target.value)}
      rows={3}
      placeholder="Enter an improved suggestion"
    />

    
<button
  type="button"
  onClick={async () => {
    const saved = await updateFindingSuggestion(
      item.id,
      editedSuggestion
    );

    if (saved) {
      setEditingFindingId(null);
      setEditedSuggestion("");
    }
  }}
>
  Save suggestion
</button>


    <button
      type="button"
      onClick={() => setEditingFindingId(null)}
    >
      Cancel
    </button>
  </div>
)}
                      <p>
                        <small>{item.source}</small>
                      </p>

                      {String(item.status || "OPEN").toUpperCase() ===
                        "OPEN" && (
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
                      {String(item.status || "OPEN").toUpperCase() ===
                         "OPEN" && (
                          <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                          changeFindingStatus(item.id, "ACCEPTED")
                              }
                           >
                          Accept finding
                             </button>
                            )}

                      {String(item.status || "").toUpperCase() ===
                        "RESOLVED" && <p>Resolved</p>}

                      {String(item.status || "").toUpperCase() ===
                        "ACCEPTED" && <p>Accepted</p>}
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
                      key={item.id || item.id}
                      item={item}
                      onOpen={openReview}
                      onDownload={downloadComplianceReport}
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



function HistoryRow({ item, onOpen, onDownload }) {
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
        type="button"
        className="history-open-button"
        onClick={() => onOpen(item)}
      >
        Open review
      </button>

      <button
        type="button"
        className="primary-button"
        onClick={() => {
          console.log("Download button clicked");
          console.log("Review item:", item);
          console.log("Review ID:", item.id || item._id);
          onDownload(item.id || item._id);
        }}
      >
        Download PDF
      </button>
    </div>
  );
}



export default App;       