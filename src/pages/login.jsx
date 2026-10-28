
import React, { useState } from "react";
import { ShieldCheck, Eye, EyeOff, ArrowRight } from "lucide-react";
import "../AuthPages.css";

const API_URL = "http://localhost:5000/api/auth";

export default function Login({ onNavigate, onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      if (!data.token) {
        setError("Login failed: the server did not return an authentication token.");
        return;
      }

      // Save the authenticated session.
      localStorage.setItem("hackguard_token", data.token);

      if (data.user) {
        localStorage.setItem(
          "hackguard_user",
          JSON.stringify(data.user)
        );
      }

      // Notify the parent component only after server verification.
      if (onSubmit) {
        await onSubmit(data);
      } else {
        setError("Login succeeded, but dashboard navigation is not configured.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        "Unable to connect to the server. Check that the backend is running."
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
          <span className="auth-eyebrow">YOUR BRAND. YOUR RULES.</span>
          <h1>Every word should protect your brand.</h1>
          <p>
            Review content, maintain consistent brand guidelines,
            and create messaging you can trust.
          </p>
          <div className="auth-feature">
            <ShieldCheck size={19} />
            <span>Keep every message on-brand.</span>
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
            <span className="auth-eyebrow">WELCOME BACK</span>
            <h2>Sign in to BrandGuard</h2>
            <p>Enter your details to access your workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <div className="auth-label-row">
              <label htmlFor="login-password">Password</label>
            </div>

            <div className="auth-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="auth-eye-button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => onNavigate?.("signup")}
            >
              Create an account
            </button>
          </p>

          <p className="auth-legal">
            By continuing, you agree to use BrandGuard responsibly.
          </p>
        </div>
      </section>
    </main>
  );
}
