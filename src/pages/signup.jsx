import React, { useState } from "react";
import { ShieldCheck, Eye, EyeOff, ArrowRight } from "lucide-react";
import "../AuthPages.css";

const API_URL = "https://invisible-peace-revision-opportunities.trycloudflare.com/api/auth";
export default function Signup({ onNavigate, onSubmit }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      setError("Please enter your name and email address.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || data.error || "Unable to create your account."
        );
      }

      setSuccess(
        data.message || "Account created successfully! You can now sign in."
      );

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      // If the parent component has a signup callback, notify it.
      if (onSubmit) {
        try {
          onSubmit(data);
        } catch (callbackError) {
          console.error("Signup callback error:", callbackError);
        }
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <div className="auth-logo">
            <ShieldCheck size={27} />
          </div>
          <span>BrandGuard</span>
        </div>

        <div className="auth-brand-message">
          <span className="auth-eyebrow">BUILD WITH CONFIDENCE</span>
          <h1>Make every piece of content count.</h1>
          <p>
            Bring your brand guidelines and content reviews
            together in one simple workspace.
          </p>
          <div className="auth-feature">
            <ShieldCheck size={19} />
            <span>Your brand identity, all in one place.</span>
          </div>
        </div>

        <p className="auth-panel-footer">
          Thoughtful content. Consistent branding.
        </p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-logo">
            <ShieldCheck size={25} />
            <span>BrandGuard</span>
          </div>

          <div className="auth-heading">
            <span className="auth-eyebrow">GET STARTED</span>
            <h2>Create your account</h2>
            <p>Set up your workspace and start reviewing content.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              type="text"
              placeholder="Enter your full name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <label htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="signup-password">Password</label>
            <div className="auth-password-wrap">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                className="auth-eye-button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            <label htmlFor="signup-confirm-password">
              Confirm password
            </label>
            <input
              id="signup-confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p role="status" aria-live="polite">
                {success}
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => onNavigate?.("login")}
            >
              Sign in
            </button>
          </p>

          <p className="auth-legal">
            Your information is handled by the BrandGuard backend.
          </p>
        </div>
      </section>
    </main>
  );
}